// Larder "parse": turns a photo, a till slip, a plate, a quick note or a recipe link into
// structured proposals the app can confirm. Runs on Supabase Edge Functions (Deno).
// Secrets: ANTHROPIC_API_KEY (set by the deploy workflow). SUPABASE_* are injected.
import Anthropic from "npm:@anthropic-ai/sdk@0.124.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.124.0/helpers/zod";
import { z } from "npm:zod@4.5.4";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const MODEL = "claude-opus-5";
const DAILY_CAP = 60;
// USD per million tokens for the model above; used only for the spend estimate shown in Settings.
const PRICE = { input: 5, output: 25, cache_read: 0.5 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ------------------------------------------------------------------ schemas
const Match = {
  item_id: z.string().nullable().describe("id of the matching catalogue item, or null if none fits"),
  item_name: z.string().describe("name as it should appear; the catalogue name when matched"),
};
const MessageOut = z.object({
  events: z.array(z.object({
    ...Match,
    type: z.enum(["finished", "used", "bought", "count", "wasted", "produced"]),
    quantity: z.number().describe("in the item's unit; 0 for finished"),
    note: z.string().nullable(),
  })),
  list_lines: z.array(z.object({ ...Match, quantity: z.number().describe("packs to buy, usually 1") })),
  unmatched: z.array(z.string()).describe("phrases you could not act on"),
});
const ShelfOut = z.object({
  items: z.array(z.object({
    ...Match,
    quantity: z.number().describe("how many of the item's unit are visible"),
    unit: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    is_new: z.boolean().describe("true when no catalogue item fits and this should be added"),
  })),
});
const ReceiptOut = z.object({
  shop: z.string().nullable(),
  date: z.string().nullable().describe("YYYY-MM-DD if printed"),
  total: z.number().nullable(),
  lines: z.array(z.object({
    text: z.string().describe("the line as printed"),
    ...Match,
    quantity: z.number().describe("packs bought"),
    price: z.number().nullable().describe("line total in rand"),
    is_food_or_household: z.boolean(),
  })),
});
const RecipeOut = z.object({
  title: z.string(),
  servings: z.number().nullable(),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  ingredients: z.array(z.object({
    ...Match,
    quantity: z.number().nullable(),
    unit: z.string().nullable().describe("g, kg, ml, litre, piece, tin, slice, tbsp, tsp, cup"),
    optional: z.boolean(),
  })),
  steps: z.string().describe("numbered steps, one per line; empty if unknown"),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
});

type Kind = "message" | "shelf_photo" | "receipt" | "plate" | "recipe_url";
interface CatalogueItem { id: string; name: string; aliases: string[]; unit: string; pack_size: number; location: string; stock: number | null }
interface Body {
  kind: Kind;
  text?: string;
  url?: string;
  location?: string;
  image?: { data: string; media_type: "image/jpeg" | "image/png" | "image/webp" };
  catalogue: CatalogueItem[];
}

const SYSTEM = `You help a farm household in South Africa keep its kitchen inventory. You read photos, till slips,
short notes and recipes and turn them into precise, conservative proposals. Prices are in rand.
Match to the catalogue by name or alias; when nothing fits, set item_id to null and give a clear generic name.
Never invent items you cannot see or read. Prefer fewer, correct entries over many guesses.`;

function catalogueText(items: CatalogueItem[]): string {
  return items
    .map((i) => `${i.id} | ${i.name}${i.aliases.length ? ` (${i.aliases.join(", ")})` : ""} | ${i.unit}${i.pack_size !== 1 ? ` x${i.pack_size}/pack` : ""} | ${i.location}${i.stock != null ? ` | have ${i.stock}` : ""}`)
    .join("\n");
}

async function fetchReadable(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Larder/1.0" }, signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  return (ld ? `STRUCTURED DATA:\n${ld.slice(0, 12000)}\n\nPAGE TEXT:\n` : "") + text.slice(0, 20000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "The reading function has no Anthropic key yet." }, 503);

  // Who is asking, and which household.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "Not signed in" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: member } = await admin.from("member").select("id, household_id").eq("auth_user_id", userData.user.id).eq("deleted", false).limit(1).maybeSingle();
  if (!member) return json({ error: "No household" }, 403);

  // Daily cap per household.
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("household_id", member.household_id).gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_CAP) return json({ error: `Daily limit of ${DAILY_CAP} reads reached. It resets at midnight UTC.` }, 429);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!body?.kind || !Array.isArray(body.catalogue)) return json({ error: "kind and catalogue are required" }, 400);

  const client = new Anthropic({ apiKey });
  const catalogue = { type: "text" as const, text: `CATALOGUE (id | name (aliases) | unit | location | stock)\n${catalogueText(body.catalogue)}`, cache_control: { type: "ephemeral" as const } };
  const system = [{ type: "text" as const, text: SYSTEM }, catalogue];
  const image = body.image ? [{ type: "image" as const, source: { type: "base64" as const, media_type: body.image.media_type, data: body.image.data } }] : [];

  let schema: z.ZodTypeAny;
  let userContent: Anthropic.ContentBlockParam[];
  switch (body.kind) {
    case "message":
      schema = MessageOut;
      userContent = [{ type: "text", text: `Note from the household: "${body.text ?? ""}"\nTurn it into stock events and shopping list lines. "Finished" or "out of" means type finished with quantity 0. "Low on" means a list line, not an event. "Bought" means type bought with the packs stated (default 1 pack, quantity in the item's unit = packs x pack size).` }];
      break;
    case "shelf_photo":
      if (!body.image) return json({ error: "image required" }, 400);
      schema = ShelfOut;
      userContent = [...image, { type: "text", text: `This is the ${body.location ?? "kitchen"}. List every catalogue item you can identify and how many units of it are visible, counting in the item's unit (for a pack, count the pack's units if you can see them, otherwise count packs x pack size). Skip things you cannot identify. Mark confidence honestly.` }];
      break;
    case "receipt":
      if (!body.image) return json({ error: "image required" }, 400);
      schema = ReceiptOut;
      userContent = [...image, { type: "text", text: "This is a till slip. Read every line: the shop, the date, each product line with its price and quantity, and the total. Match products to the catalogue where you can. Mark non-food, non-household lines (airtime, bags, discounts) with is_food_or_household false." }];
      break;
    case "plate":
      if (!body.image) return json({ error: "image required" }, 400);
      schema = RecipeOut;
      userContent = [...image, { type: "text", text: `This is a plate of food we made at home${body.text ? `. The cook says: "${body.text}"` : ""}. Draft it as a recipe: a short title, the number of servings shown, the ingredients with sensible home-cook quantities per serving scaled to the servings, and brief steps. Match ingredients to the catalogue where you can.` }];
      break;
    case "recipe_url": {
      if (!body.url) return json({ error: "url required" }, 400);
      schema = RecipeOut;
      let page = "";
      try { page = await fetchReadable(body.url); } catch { return json({ error: "Could not fetch that page." }, 422); }
      userContent = [{ type: "text", text: `Extract the recipe from this web page. Keep the author's quantities and units; convert cups and spoons only if the item's unit is grams or millilitres and you are confident. Match ingredients to the catalogue where you can.\n\n${page}` }];
      break;
    }
    default:
      return json({ error: `Unknown kind ${String((body as { kind: unknown }).kind)}` }, 400);
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(schema), effort: "medium" },
    });
    const u = response.usage;
    const cost = ((u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cache_read) / 1_000_000;
    await admin.from("ai_usage").insert({
      household_id: member.household_id, member_id: member.id, kind: body.kind, model: response.model,
      input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0, cache_read_tokens: u.cache_read_input_tokens ?? 0, cost_usd: cost,
    });
    if (response.stop_reason === "refusal") return json({ error: "The model declined to read this." }, 422);
    if (!response.parsed_output) return json({ error: "Could not read that clearly. Try a closer, brighter photo." }, 422);
    return json({ kind: body.kind, result: response.parsed_output, usage: { input: u.input_tokens, output: u.output_tokens, cost_usd: cost } });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "The Anthropic key was rejected. Check it in GitHub secrets and redeploy." }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Anthropic is busy. Try again in a minute." }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: `Anthropic error: ${e.message}` }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
