# Household Larder — Design

Working name: **Larder**. A shared, phone-first tool for running the food and consumables side of a farm household: what we have, what is running out, what we are eating this week, what goes in the school snack box, and what to buy on the next town trip.

Status: design approved for build. See `PLAN.md` for phases.

---

## 1. Who it is for and what it must do

**Household**

| Person | Role in the tool | Notes |
|---|---|---|
| Wife (primary user) | Plans, captures, shops | Must be able to run the whole thing from her phone in seconds |
| Kevin | Captures, shops, maintains | Builds and hosts it |
| Daughter, 3 | Eats | School Mon–Fri half day; needs a snack box each school day |

**Setting.** A farm. Town trips are infrequent, so running out is expensive in time, not just money. Connectivity is patchy. Some items are bought in bulk on a cadence (water, toilet paper, pool chlorine, washing liquid, gas). Some food may come from the farm itself (eggs, milk, produce) and should be tracked as *produced*, not *bought*.

**The one job.** Never be surprised by an empty shelf, and never stand in the kitchen at 17:30 wondering what to cook.

**Success looks like**

- Marking something finished takes under 5 seconds, one-handed, with a toddler on the hip.
- A weekly plan for breakfasts, lunches, dinners, snacks and five snack boxes takes under 15 minutes on Sunday.
- The shopping list writes itself from the plan, the stock levels and the cycle predictions, and is grouped by shop.
- After two months the tool knows roughly how fast we go through milk, nappies, chlorine and coffee, and warns before the next trip.

---

## 2. Design principles

1. **Capture in seconds, tidy later.** Every input path has a fast, forgiving form. A "capture inbox" holds anything not yet matched to an item so nothing is lost and nobody is forced to fill in a form mid-task.
2. **Ledger, not spreadsheet.** Stock is never *edited*; it is *derived* from a stream of events (bought, used, finished, counted, produced, wasted). That is what makes history and pattern analysis possible.
3. **The plan drives the list.** Meals are planned first; the shopping list is a consequence of the plan minus what is already in the house, plus what the predictions say will run out.
4. **Farm-first.** Works offline and syncs later. Thinks in *trips* and *lead times*, not "order now". Supports bulk units and home-produced items.
5. **The assistant does the reading.** Photos of shelves, receipts and free-text messages ("milk finished, and we're low on rusks") are read by Claude and turned into proposed events. Humans confirm with one tap.
6. **Two phones, one truth.** Both parents see the same state within seconds when online. No merge conflicts on the shopping list in the aisle.
7. **Boring, durable technology.** Something that still works in five years with minimal maintenance beats something clever.

---

## 3. Core concepts (domain model)

### 3.1 Item
The catalogue of things we keep. One row per *kind* of thing, not per pack.

- `name`, `aliases[]` (for parsing "loo roll" = "toilet paper")
- `category`: fresh, dairy, pantry, frozen, drinks, baby & child, bathroom, cleaning & laundry, pool & garden, utilities (gas, water), pet & farm
- `location`: pantry, fridge, freezer, bathroom, laundry, pool shed, store room, garage
- `unit`: piece, pack, roll, litre, kg, bottle, bag, box (with `pack_size` so "1 pack of 9 rolls" adds 9 rolls)
- `par_level`: minimum we want on hand; below this it goes on the list
- `tracking_mode`:
  - `count` — we know how many (rolls of toilet paper, tins of tomatoes)
  - `level` — we estimate full / half / low / out (washing liquid, cooking oil)
  - `cycle` — we only record purchases, and the tool learns the interval (chlorine, gas bottles, water delivery)
- `preferred_shop`, `typical_price_zar`, `bulk_ok`
- `source`: bought or farm-produced
- `perishable_days` (optional) for use-by hints
- `snackbox_ok`, `kid_ok` flags for meal and lunchbox planning

### 3.2 Stock event (the ledger)
Append-only. Current stock = sum of deltas since the last `count`.

- `item_id`, `type`: `bought`, `used`, `finished`, `count`, `produced`, `wasted`, `adjust`
- `quantity` (in item units), `at` (timestamp), `by` (who), `source`: `tap`, `text`, `photo`, `receipt`, `shopping`, `plan`
- `note`, `price_zar` (for `bought`), `capture_id` (link back to the photo or message it came from)

Why events: consumption rate is `used + finished` over time; waste is visible; a `count` from a shelf photo resets drift without losing history.

### 3.3 Location snapshot (photo)
A photo of a shelf, fridge, or cupboard.

- `location`, `photo_url`, `taken_at`, `by`
- `extracted[]`: what Claude saw — item guess, quantity guess, confidence
- `confirmed[]`: what a human agreed to, which becomes `count` events

Snapshots are also the visual history: "what did the pantry look like in March?"

### 3.4 Cycle profile (derived, per item)
For anything with `tracking_mode = cycle` or enough history:

- `rate_per_day` (from `used`/`finished` events) **or** `median_interval_days` (from `bought` events)
- `predicted_runout_date`
- `confidence`: low until 3+ data points
- `lead_time_days`: how far ahead we need to know, defaulting to days until the next planned trip plus a buffer

### 3.5 Recipe
- `title`, `servings`, `prep_minutes`, `cook_minutes`
- `ingredients[]`: `{ item_id | free_text, quantity, unit, optional }`
- `steps` (markdown), `source_url`, `photo_url`
- `tags[]`: quick, weeknight, batch-cook, freezer-friendly, kid-favourite, braai, one-pot, leftovers-lunch, snackbox
- `rating` (1–5 per adult), `daughter_verdict` (ate it / picked / refused)
- Derived: `times_cooked`, `last_cooked`, `avg_cost_zar`

### 3.6 Idea (recipes we want to try)
The "growing list". Lighter than a recipe.

- `title`, `source_url`, `photo_url`, `added_by`, `why` (one line), `tags[]`
- `status`: idea → scheduled → cooked (promote to Recipe with a rating) or → dropped

### 3.7 Meal plan
One row per meal slot per day.

- `date`, `slot`: breakfast, lunch, dinner, snack, **school_snackbox**
- `recipe_id` or `free_text` ("leftovers", "eggs on toast")
- `servings`, `for[]` (who is eating; the snack box is daughter-only)
- `status`: planned, cooked, skipped, swapped
- `notes` (what came back uneaten in the snack box)

The `school_snackbox` slot exists only on school days (Mon–Fri, honouring a school-holiday calendar).

### 3.8 Snack box builder
A template for the daughter's school box, driven by component slots rather than recipes:

- Components: fruit, veg, protein, carb, treat, drink (configurable)
- Each component has a rotating pool of `snackbox_ok` items
- Rules: no repeats within the week, honour school rules (e.g. no nuts), respect what she actually ate last time
- Output: five boxes for the week, each feeding the shopping list

### 3.9 Shopping list and trip
- `trip`: `planned_date`, `shops[]`, `status`
- `list_line`: `item_id`, `quantity`, `reason`: below par / plan needs it / predicted runout / manual, `shop`, `checked`, `price_paid_zar`
- Checking a line off creates a `bought` event with the price; the trip becomes the receipt.

### 3.10 Capture inbox
Anything that arrived and is not yet resolved: a text message, a voice note transcript, a photo, a receipt. Each has `raw`, `proposed_events[]`, `status`: pending / confirmed / dismissed. This is the safety net for principle 1.

---

## 4. Inputs — how things get in

| Path | Speed | How it works |
|---|---|---|
| **Finished tap** | 2 s | Home screen shows a grid of the 20 most-used items; tap = `finished` event. Long-press = "low". |
| **Text / voice** | 5 s | Type or dictate: "milk finished, toilet paper low, buy more rusks". Claude parses into events and list lines; confirm with one tap. |
| **Shelf photo** | 20 s + review | Photograph a shelf or the fridge. Claude returns a list of items and quantities compared against current stock. Accept / edit per row → `count` events. |
| **Receipt photo** | 20 s + review | Photograph the till slip. Claude extracts lines, prices, and shop → `bought` events and price history. |
| **Shopping check-off** | 0 s extra | Ticking a line in the aisle records the purchase. |
| **Cooked it** | 1 tap | Marking a planned meal cooked deducts its ingredients (`used` events) and logs it against the recipe. |
| **QR shelf labels** | 3 s | Printed QR codes stuck on shelves or containers open the "finished / low / count" screen for that item. Works for the pool shed and laundry where nobody has the app open. |
| **Recipe from URL** | 10 s | Paste a link; Claude extracts title, ingredients, steps and maps ingredients to items. |
| **Farm produce** | 5 s | "12 eggs collected" → `produced` event. |

Every path except check-off lands in the capture inbox first when confidence is low, or is applied immediately when confidence is high and the user has enabled auto-apply for that path.

---

## 5. The weekly rhythm the tool supports

**Sunday (15 min)** — Plan the week. Open the week grid; the tool proposes dinners from favourites weighted by "not cooked recently", one slot for an Idea, leftovers for a lunch, and five snack boxes with no repeats. Adjust, save. The shopping list appears.

**Daily (seconds)** — Today screen shows: today's meals, today's snack box, anything predicted to run out before the next trip, and the finished-tap grid. Cook → tap "cooked". Snack box comes home → tap what came back.

**Town trip (as it happens)** — Open the list for the trip, grouped by shop then aisle. Tick lines. Photograph the slip if anything was bought off-list. Stock updates itself.

**Monthly (5 min)** — Glance at Insights: what we spend by category, what we waste, which recipes are in a rut, whether the chlorine prediction is holding.

---

## 6. Analysis and patterns

All derived from the ledger, none requiring extra input.

- **Consumption rate per item** — units per week, trailing 4, 8 and 12 weeks; flag changes ("milk usage up 30% since school started").
- **Run-out prediction** — per item, with confidence; surfaces as a sorted "running out" list with days remaining.
- **Cycle learning** — for cycle items, median and spread of purchase intervals; next predicted date; drift alerts if a purchase is overdue.
- **Trip readiness** — given the next trip date, everything that will run out before the *following* trip goes on this trip's list.
- **Spend** — per trip, per shop, per category, per month; price history per item so the shop with the best price is visible.
- **Recipe rotation** — cooked-frequency vs rating; nudges to retire or revisit; how many Ideas got tried.
- **Snack box** — variety score per week; what comes back uneaten most often; component balance.
- **Waste** — what gets thrown out and roughly what it cost.
- **Seasonality** (after a year) — braai season, winter soups, school holidays.

---

## 7. Screens

Bottom navigation, five tabs. Mobile-first, works on a laptop too.

1. **Today** — today's meals and snack box; running-out list; finished-tap grid; capture button (camera / text / mic).
2. **Stock** — by location; each item shows stock, par, days remaining; filters: low, running out soon, cycle items; item detail with history sparkline and events.
3. **Plan** — week grid (7 days × 5 slots); drag a recipe in; "suggest week"; snack box builder; school-holiday toggle.
4. **Recipes** — Favourites (sortable by rating, last cooked, quick) and Ideas (the want-to-try list); paste-a-link import.
5. **Shop** — current trip list grouped by shop; tick lines; add trip; receipt capture.

Plus **Insights** (from the Today header) and **Inbox** (badge when captures need confirming).

---

## 8. Architecture

**Shape:** a Progressive Web App installed on both phones, local-first, syncing to a small hosted database, with one server-side function that talks to Claude.

```
Phone A (PWA) ──┐
                ├── IndexedDB (local, offline) ⇄ Supabase (Postgres, Auth, Storage)
Phone B (PWA) ──┘                                        │
                                                         └── Edge Function ── Claude API
                                                             (photo/text/receipt/recipe parsing)
```

**Stack (recommended)**

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + Svelte + TypeScript, `vite-plugin-pwa` | Small, fast, little ceremony; installable; service worker for offline |
| Local store | IndexedDB via Dexie | Offline queue of events; instant UI |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) | Free tier is ample for one household; Postgres makes the analytics plain SQL; Storage holds photos |
| AI | Claude via a Supabase Edge Function | Keeps the API key off the phones; one place to shape prompts and validate JSON |
| Hosting | GitHub Pages from this repo (or Vercel) | Static, free, deploys on push |
| Auth | Supabase magic link, two users, one `household_id` | No passwords to forget |

**Offline model.** Events are written locally first with a client-generated id, queued, and pushed when online. Because stock is an append-only ledger, two phones adding events offline never conflict. The only last-write-wins records are meal-plan slots and list ticks, which is acceptable.

**Photos.** Compressed client-side to ~1 MB before upload. Stored in a private bucket; extracted data stored alongside so the photo is optional to keep long-term.

**Alternative if you want zero backend:** a single-file HTML app with IndexedDB and manual export/import. Simpler, but no sync between phones and no photo parsing. Not recommended given two users.

---

## 9. The Claude layer

One edge function, `parse`, with a `kind` parameter. Every call returns strict JSON validated against a schema before anything is written; anything invalid or low-confidence goes to the inbox.

| kind | Input | Output |
|---|---|---|
| `shelf_photo` | image + location + current stock for that location | `[{ item_match, quantity, unit, confidence, is_new_item }]` |
| `receipt` | image | `{ shop, date, lines: [{ text, item_match, qty, price }] , total }` |
| `message` | free text + item catalogue (names + aliases) | `{ events: [...], list_lines: [...], unmatched: [...] }` |
| `recipe_url` | URL (fetched server-side) | Recipe object with ingredients mapped to items |
| `suggest_week` | favourites, ideas, last 6 weeks of plans, stock, constraints | Draft plan with reasons ("uses the mince before Thursday") |
| `snackbox_week` | pools, rules, last 3 weeks, what came back uneaten | Five boxes |

Item matching happens against the household's own catalogue (with aliases), so it gets better as the catalogue grows. Prompts and schemas live in the repo under `supabase/functions/parse/`.

---

## 10. Schema sketch (Postgres)

```sql
create table household (id uuid primary key, name text);
create table member (id uuid primary key, household_id uuid, name text, role text, birthdate date);

create table item (
  id uuid primary key, household_id uuid,
  name text, aliases text[], category text, location text,
  unit text, pack_size numeric default 1,
  par_level numeric, tracking_mode text check (tracking_mode in ('count','level','cycle')),
  preferred_shop text, typical_price_zar numeric, bulk_ok bool,
  source text default 'bought', perishable_days int,
  snackbox_ok bool default false, kid_ok bool default true,
  archived bool default false
);

create table stock_event (
  id uuid primary key, household_id uuid, item_id uuid,
  type text check (type in ('bought','used','finished','count','produced','wasted','adjust')),
  quantity numeric, at timestamptz default now(), by_member uuid,
  source text, note text, price_zar numeric, capture_id uuid
);

create table capture (
  id uuid primary key, household_id uuid, kind text, raw_text text, photo_path text,
  location text, proposed jsonb, status text default 'pending', created_at timestamptz default now(), by_member uuid
);

create table recipe (
  id uuid primary key, household_id uuid, title text, servings int,
  prep_minutes int, cook_minutes int, steps text, source_url text, photo_path text,
  tags text[], rating jsonb, daughter_verdict text
);
create table recipe_ingredient (
  recipe_id uuid, item_id uuid, free_text text, quantity numeric, unit text, optional bool default false
);

create table idea (
  id uuid primary key, household_id uuid, title text, source_url text, photo_path text,
  added_by uuid, why text, tags text[], status text default 'idea', created_at timestamptz default now()
);

create table meal_slot (
  id uuid primary key, household_id uuid, date date,
  slot text check (slot in ('breakfast','lunch','dinner','snack','school_snackbox')),
  recipe_id uuid, free_text text, servings int, for_members uuid[],
  status text default 'planned', notes text
);

create table trip (id uuid primary key, household_id uuid, planned_date date, shops text[], status text default 'open');
create table list_line (
  id uuid primary key, trip_id uuid, item_id uuid, quantity numeric,
  reason text, shop text, checked bool default false, price_paid_zar numeric
);

create table school_calendar (household_id uuid, term_start date, term_end date, label text);

-- Derived views: current_stock, consumption_rate, cycle_profile, runout_forecast, spend_by_category
```

Row-level security: every table filtered by `household_id = auth.jwt()->>'household_id'`.

---

## 11. Assumptions and open decisions

Assumptions made so the build can start:

- Two adult users on Android or iPhone; the app is installed from the browser, not the app stores.
- Currency is ZAR; shops are the usual South African set (Woolworths, Checkers, Pick n Pay, Spar, Makro for bulk) and are editable.
- The school follows a term calendar we can type in once a year.
- Water means bulk drinking water or tank refills tracked as a cycle item; if it is a municipal utility instead, it simply is not an item.
- Claude API usage will be small (a few dozen calls a week) and is billed to Kevin's account.

Decisions that would change the build, with the default I will take if you say nothing:

| Decision | Default | Alternative |
|---|---|---|
| Backend | Supabase | Zero-backend single file (no sync) |
| Message intake | In-app text box and dictation | Also a WhatsApp or Telegram bot forwarding to the parse function |
| Farm produce | Tracked as `produced` events | Ignore; treat everything as bought |
| Notifications | In-app badges plus a Sunday and pre-trip push notification | Email digest |
| Recipe discovery | Paste-a-link only | Claude suggests new Ideas weekly from tags you like |
