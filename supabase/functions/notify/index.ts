// Larder "notify": web push subscriptions and the daily nudge.
// Actions: public_key, subscribe, unsubscribe, test (signed-in members) and run (service role only).
import webpush from "npm:web-push@3.6.7";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CONTACT = "mailto:larder@example.invalid";

interface Sub { id: string; endpoint: string; p256dh: string; auth: string }
interface Push { title: string; body: string; tag: string; path: string }

async function vapid(admin: SupabaseClient): Promise<{ publicKey: string; privateKey: string }> {
  const { data } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return { publicKey: data.public_key, privateKey: data.private_key };
  const keys = webpush.generateVAPIDKeys();
  await admin.from("push_config").insert({ id: 1, public_key: keys.publicKey, private_key: keys.privateKey });
  return keys;
}

async function send(admin: SupabaseClient, subs: Sub[], payload: Push): Promise<number> {
  const keys = await vapid(admin);
  webpush.setVapidDetails(CONTACT, keys.publicKey, keys.privateKey);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410 mean the browser dropped this subscription for good.
      if (status === 404 || status === 410) await admin.from("push_subscription").delete().eq("id", s.id);
      else await admin.from("push_subscription").update({ failed_at: new Date().toISOString() }).eq("id", s.id);
    }
  }
  return sent;
}

// ---------------------------------------------------------------- the daily nudge
const DAY = 86_400_000;
const dayOf = (iso: string) => iso.slice(0, 10);
const plus = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);

async function nudgesFor(admin: SupabaseClient, householdId: string, today: string): Promise<Push[]> {
  const out: Push[] = [];
  const dow = new Date(today).getUTCDay();

  // 1. The next trip is tomorrow: the list is ready.
  const { data: trips } = await admin.from("trip").select("id, planned_date").eq("household_id", householdId).eq("status", "open").eq("deleted", false);
  const tomorrow = plus(today, 1);
  const trip = (trips ?? []).find((t) => t.planned_date === tomorrow);
  if (trip) {
    const { count } = await admin.from("list_line").select("id", { count: "exact", head: true }).eq("trip_id", trip.id).eq("checked", false).eq("deleted", false);
    if (count) out.push({ title: "Town trip tomorrow", body: `${count} item${count === 1 ? "" : "s"} on the list.`, tag: "trip", path: "#/shop" });
  }

  // 2. Sunday: plan the week if next week is mostly empty.
  if (dow === 0) {
    const { count } = await admin.from("meal_slot").select("id", { count: "exact", head: true })
      .eq("household_id", householdId).eq("deleted", false).gte("date", plus(today, 1)).lte("date", plus(today, 7));
    if ((count ?? 0) < 5) out.push({ title: "Plan the week", body: "Fill dinners and snack boxes in a couple of taps.", tag: "plan", path: "#/plan" });
  }

  // 3. Anything already out, or below its keep-at-least level, that is not on an open list.
  const { data: items } = await admin.from("item").select("id, name, par_level, tracking_mode").eq("household_id", householdId).eq("deleted", false).eq("archived", false);
  if (items?.length) {
    const { data: events } = await admin.from("stock_event").select("item_id, type, quantity, at").eq("household_id", householdId).eq("deleted", false).order("at", { ascending: true });
    const stock = new Map<string, number | null>();
    for (const e of events ?? []) {
      const cur = stock.get(e.item_id) ?? null;
      if (e.type === "count") stock.set(e.item_id, Number(e.quantity));
      else if (e.type === "finished") stock.set(e.item_id, 0);
      else if (e.type === "bought" || e.type === "produced") stock.set(e.item_id, (cur ?? 0) + Number(e.quantity));
      else if (e.type === "used" || e.type === "wasted") stock.set(e.item_id, Math.max(0, (cur ?? 0) - Number(e.quantity)));
      else if (e.type === "adjust") stock.set(e.item_id, (cur ?? 0) + Number(e.quantity));
    }
    const short = items.filter((i) => {
      if (i.tracking_mode === "cycle") return false;
      const s = stock.get(i.id);
      if (s === undefined || s === null) return false;
      return s <= 0 || (i.par_level !== null && s < Number(i.par_level));
    });
    if (short.length >= 3) {
      const names = short.slice(0, 3).map((i) => i.name).join(", ");
      out.push({ title: `${short.length} things are low`, body: `${names}${short.length > 3 ? " and more" : ""}.`, tag: "low", path: "#/shop" });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: { action?: string; subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }; label?: string; endpoint?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const action = body.action ?? "public_key";

  // The scheduled run is the only action a service-role caller may take.
  if (action === "run") {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return json({ error: "Not allowed" }, 403);
    const today = new Date().toISOString().slice(0, 10);
    const { data: households } = await admin.from("household").select("id");
    let sent = 0;
    for (const h of households ?? []) {
      const { data: subs } = await admin.from("push_subscription").select("id, endpoint, p256dh, auth").eq("household_id", h.id);
      if (!subs?.length) continue;
      for (const push of await nudgesFor(admin, h.id, today)) {
        const { error } = await admin.from("notification_log").insert({ household_id: h.id, kind: push.tag, on_date: today });
        if (error) continue; // already sent today
        sent += await send(admin, subs as Sub[], push);
      }
    }
    return json({ ok: true, sent });
  }

  // Everything else is a signed-in household member.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "Not signed in" }, 401);
  const { data: member } = await admin.from("member").select("id, household_id").eq("auth_user_id", userData.user.id).eq("deleted", false).limit(1).maybeSingle();
  if (!member) return json({ error: "No household" }, 403);

  switch (action) {
    case "public_key":
      return json({ public_key: (await vapid(admin)).publicKey });
    case "subscribe": {
      const sub = body.subscription;
      if (!sub?.endpoint || !sub.keys?.p256dh) return json({ error: "subscription required" }, 400);
      await admin.from("push_subscription").upsert({
        household_id: member.household_id, member_id: member.id, endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh, auth: sub.keys.auth, label: body.label ?? null, failed_at: null,
      }, { onConflict: "endpoint" });
      return json({ ok: true });
    }
    case "unsubscribe":
      if (body.endpoint) await admin.from("push_subscription").delete().eq("endpoint", body.endpoint);
      return json({ ok: true });
    case "test": {
      const { data: subs } = await admin.from("push_subscription").select("id, endpoint, p256dh, auth").eq("household_id", member.household_id);
      const sent = await send(admin, (subs ?? []) as Sub[], { title: "Larder", body: "Notifications are working.", tag: "test", path: "#/today" });
      return json({ ok: true, sent });
    }
    default:
      return json({ error: `Unknown action ${action}` }, 400);
  }
});
