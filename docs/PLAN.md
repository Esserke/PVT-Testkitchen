# Household Larder — Implementation Plan

Companion to `DESIGN.md`. Five phases, each ending with something the household can actually use. Effort is in focused build sessions (roughly half a day each) using Claude Code in this repo.

---

## Phase 0 — Setup (1 session)

Goal: an empty app that installs on both phones and syncs a hello-world row.

- [x] Scaffold Vite + Svelte + TypeScript with `vite-plugin-pwa`; app shell with the five tabs
- [x] Create the Supabase project; apply the schema from `DESIGN.md §10` via `supabase/migrations/`
- [x] Row-level security by `household_id`; two users via magic link; one household row
- [x] Dexie schema mirroring the tables; a `sync.ts` that pushes queued local writes and pulls changes
- [x] GitHub Actions: build and deploy to GitHub Pages on push to `main`
- [x] `.env.example` for the Supabase URL and anon key; no secrets in the repo

Done when: both phones show the same test item after one is added offline and comes back online.

---

## Phase 1 — Stock and the finished tap (2–3 sessions)

Goal: the shelf never surprises us. Manual only, no AI yet.

- [x] Seed the item catalogue from a CSV of what you actually keep (`data/items.csv`); a script imports it
- [x] Stock tab: items by location; stock, par level, days-remaining placeholder; low filter
- [x] Item detail: edit fields; event history list
- [x] Today tab: finished-tap grid of the 20 most-touched items; long-press = low; undo toast
- [x] `count` / `level` quick set for an item (full, half, low, out for level-tracked items)
- [x] Shop tab v1: list auto-populated by "below par"; manual add; tick = `bought` event with optional price
- [x] Trips: create the next trip with a date; the list belongs to a trip
- [x] Capture inbox skeleton: a text box that stores raw text for later parsing (no AI yet)

Done when: your wife has used the finished tap for a week and the list for a real town trip without opening a notes app.

---

## Phase 2 — Meals, recipes and the snack box (3 sessions)

Goal: Sunday planning in 15 minutes; the list writes itself from the plan.

- [x] Recipes tab: create and edit recipes; ingredients pick from the catalogue or free text; tags; ratings; daughter verdict
- [x] Ideas list: title, link, why; promote to recipe; drop
- [x] Plan tab: 7 × 5 week grid; tap a slot to pick a recipe, an idea, or type free text; copy last week
- [x] School days: every weekday, no term calendar (Kevin, 2026-09-05); `school_snackbox` shows Mon–Fri. Term calendar stays optional for later
- [x] Snack box builder: three compartments, item pools, no-repeat rule; per-item ate/some/left verdicts, Faye page with loves, not keen, untried and recent boxes; auto-fill steered by verdicts
- [x] "Cooked" on a meal → `used` events for its ingredients scaled to servings; recipe stats update
- [x] Shopping list v2: lines from plan ingredients minus current stock, with `reason`; grouped by shop; merged with below-par lines
- [x] Leftovers: mark a dinner as "makes lunch tomorrow" to fill the next lunch slot

Done when: a full week is planned, cooked and shopped through the app and the list needed no manual additions for planned meals.

---

## Phase 3 — Claude does the reading (3 sessions)

Goal: photos and messages replace typing.

- [x] Supabase Edge Function `parse` with `kind` dispatch; strict JSON schemas; API key in function secrets
- [x] `message`: inbox text → proposed events and list lines; one-tap confirm; aliases learned from corrections
- [x] `shelf_photo`: camera capture, client-side compression, upload to Storage, extraction → diff against current stock for that location → confirm rows → `count` events; keep the snapshot
- [x] `receipt`: till-slip photo → `bought` events with prices and shop; unmatched lines offered as new items
- [x] `recipe_url`: paste a link → draft recipe with ingredients mapped to items
- [x] `plate`: photograph a plate → draft recipe with ingredients mapped to items, logged as today's meal and deducted
- [x] `lunchbox`: photograph the snack box when packed (fills today's box) or when home (verdicts per item)
- [x] `child_plate`: Faye's plate before and after → her own meal record with how much was eaten
- [x] Shelf photos shown as a stock take: app vs photo, trust shelf or keep app
- [x] Till slips kept as an expense record; monthly budget with projection in Insights
- [ ] Dictation via the browser speech API feeding the message parser (phones already offer keyboard dictation into the note box)
- [x] Confidence thresholds and per-path auto-apply setting; everything else lands in the inbox
- [x] Cost guard: count calls per day; show monthly spend estimate in settings

Done when: a fridge photo produces a correct stock count for at least 8 of 10 items on first try, and "milk finished, buy rusks" needs no edits.

---

## Phase 4 — Insights and cycles (2 sessions)

Goal: the tool predicts instead of just recording.

- [x] Forecasting in the app (`domain/forecast.ts`): consumption rate over 4/8/12-week windows, median purchase interval for cycle items, run-out date with confidence. Kept in TypeScript rather than SQL views because the whole ledger is already on the phone and this works offline
- [x] Running-out list on Today, sorted by days remaining, with confidence badges
- [x] Trip readiness: everything predicted to run out before the trip after this one is added to this trip's list with reason `predicted`
- [x] Cycle items setup: water, toilet paper, chlorine, washing liquid, gas — seeded with a first guess interval that the data then replaces
- [x] Insights screen: spend by category and shop per month; price history per item; recipe rotation; snack box variety and "came back uneaten"; waste
- [x] Rate-change alerts ("nappies up 40% over 8 weeks")
- [x] Item sparkline on detail screens

Done when: the chlorine and toilet paper predictions are within a week of reality over two cycles.

---

## Phase 5 — Polish and reach (2 sessions)

Goal: it fits into the house, not just the phone.

- [ ] QR shelf labels: generate a printable A4 sheet of item QR codes; scanning opens the quick-action screen for that item
- [ ] Push notifications: Sunday "plan the week", day-before-trip "list is ready", running-out alerts
- [ ] "Suggest week" and "snack box week" via Claude, using history and stock
- [ ] Optional: WhatsApp or Telegram bot that forwards messages and photos to the parse function
- [ ] Optional: weekly Ideas suggestions from tags you rate highly
- [ ] Data export (CSV of the ledger, recipes as markdown) so nothing is locked in
- [ ] Household settings: members, shops, categories, locations, school terms

---

## Repo layout

```
/
├── docs/                 DESIGN.md, PLAN.md, decisions log
├── app/                  Vite + Svelte PWA
│   ├── src/lib/db/       Dexie schema, sync
│   ├── src/lib/domain/   stock maths, forecasting, list generation (pure functions, unit-tested)
│   ├── src/routes/       today, stock, plan, recipes, shop, insights, inbox
│   └── src/components/
├── supabase/
│   ├── migrations/       schema and views
│   └── functions/parse/  Claude edge function, prompts, JSON schemas
├── data/items.csv        starting catalogue
└── .github/workflows/    deploy to Pages
```

## Working agreements

- Domain logic (stock derivation, forecasts, list generation) lives in pure TypeScript with tests; the UI only renders.
- Every schema change is a migration; never edit the database by hand.
- Each phase ends with a short entry in `docs/DECISIONS.md` recording what changed and why.
- Real use starts at the end of Phase 1; later phases are shaped by what the first weeks of use reveal.

## What I need from you before Phase 0

1. Confirm Supabase as the backend, or choose the zero-backend alternative.
2. A rough list of the items you keep (even a photo of the pantry and the cleaning cupboard is enough to draft `data/items.csv`).
3. The school term dates and any snack-box rules from the school.
4. Your usual shops and how often you go to town.
5. Whether anything is produced on the farm that should be tracked.
