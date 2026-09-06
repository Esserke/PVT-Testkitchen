# Decisions

## 2026-09-05 — Phase 0

- **Backend: Supabase**, confirmed by Kevin. Local-only mode kept as a fallback when the keys are absent.
- **Stack**: Vite 8, Svelte 5 (runes), TypeScript, `vite-plugin-pwa`, Dexie 4, `@supabase/supabase-js` 2. GitHub Pages hosting via Actions.
- **Sync model**: local-first outbox. Server stamps `updated_at` with a trigger so per-table pull cursors stay monotonic. Rows with a pending local write are not overwritten by a pull. Realtime `postgres_changes` only nudges a sync; it is not the source of truth.
- **Membership**: `member.auth_user_id` links a Supabase auth user to a household. RLS policies call `my_household_ids()`. Onboarding runs through two `security definer` functions so no client ever inserts into `household` or `member` directly.
- **Routing**: hash routes, so GitHub Pages needs no rewrite rules.
- **Starter catalogue**: `app/src/data/items.csv`, 124 items drafted from nine kitchen photos (fridge, freezer drawers, chest freezer, under-sink cupboard, two pantry cupboards, water store, drinks fridge). Par levels are first guesses to be corrected in use. New locations added: chest freezer, drinks fridge, under sink.
- **Not in Phase 0**: stock events, shopping list, any Claude calls. Those are Phase 1 and Phase 3.

## 2026-09-05 — Answers from Kevin, and Phase 1

- **School**: every weekday, no holidays to model. The snack box slot appears Mon–Fri; the school calendar table stays in the schema but is unused until needed.
- **Shops**: Woolworths, Checkers, Spar, Everfresh. Fresh produce defaults to Everfresh in the catalogue; bulk defaults moved from Makro to Checkers.
- **Farm produce**: eggs and honey are `source = farm`. The quick sheet offers "Collected" for them, which writes a `produced` event.
- **Stock derivation**: the latest `count` (or `finished`, which means zero) fixes an absolute level; `bought`/`produced` add, `used`/`wasted` subtract, `adjust` is signed. Stock never goes below zero. Level items store fractions (1, 0.5, 0.25, 0) as `count` events.
- **Below par** means strictly below `par_level` for count items and at or below a quarter for level items. Cycle items never appear on the list until Phase 4 forecasting exists.
- **Shopping list**: one open trip at a time. Automatic `below_par` lines are reconciled against stock when the Shop tab opens and on "Update from stock"; manual and ticked lines are never touched. Ticking writes a `bought` event and stores its id on the line (`list_line.event_id`, added to the schema before any deployment) so unticking undoes it. Prices typed on a line are copied onto the event.
- **Inbox**: quick notes are stored as `capture` rows with status pending and shown on Today. Nothing parses them until Phase 3; "Done" dismisses.
- **Undo**: a toast with Undo soft-deletes the event that was just written. The item history screen can undo only the most recent event, to keep the ledger honest.
- **Testing**: domain logic under `app/src/lib/domain/` has vitest unit tests (`npm test`). Screens are smoke-tested in headless Chromium before each push.

## 2026-09-05 — Phase 2

- **Week view** is a vertical list of day cards, not a 7-column grid, because it is used on a phone. Weeks start on Monday. The snack box row appears Monday to Friday only.
- **A meal slot** holds one of: a recipe, free text, or a list of items (`meal_slot.item_ids`, added to the schema). Snack boxes are item lists. Ideas placed on the plan become free text prefixed "Idea:" and the idea moves to `scheduled`.
- **Snack components** live on the item (`item.snack_component`: fruit, veg, protein, carb, treat, drink) with `snackbox_ok`. Auto-fill picks one item per component per school day, avoids repeats within the week, prefers least-recently-used, and skips items that are out. Peanut butter is excluded from the box by default in case of a no-nuts rule.
- **Ingredient units**: grams and kilograms, millilitres and litres convert; plurals match; anything else that cannot be converted counts as "needs one" so it still reaches the list. Optional and free-text ingredients never reach the list.
- **Cooking** deducts count-tracked items only, scaled by servings over the recipe's servings. Level and cycle items are not touched, since a splash of oil is not measurable.
- **List window**: from today to seven days after the trip date. Plan needs and below-par needs merge into one line per item with the larger quantity; the reason shows "for meals" when the plan drove it. Automatic lines are raised, added or removed on reconcile; manual and ticked lines are never touched.
- **Leftovers** write tomorrow's lunch as free text "Leftover <dinner>", not a recipe, so nothing is deducted twice.
- **Fill dinners** is deterministic for now: least recently cooked, then highest rating. Claude-assisted suggestions remain Phase 5.

## 2026-09-05 — Switching households

- First real use showed the obvious trap: both people tap Create and end up in two households. Joining now moves you (other memberships end) and a household left with no members is removed, so an accidental empty one cleans itself up. Settings has a Switch household button calling `leave_household()`. The setup screen defaults to Join.
- Migration `0002_switch_household.sql` must be run in the Supabase SQL editor like the first.

## 2026-09-05 — Phase 4

- **Forecasts live in the app, not SQL views.** The full ledger is synced to every phone, so forecasting in TypeScript works offline and is unit-tested. Views can come later for reporting.
- **Consumption** is every drop in derived stock: used, wasted, finished, and a count lower than the running total. Purchases and adjustments never count. Rate is over a 28-day window, widening to 56 and 84 days when there are fewer than two data points.
- **Two methods.** Count and level items use stock divided by rate. Cycle items, and anything with no consumption logged but two or more purchases, use the median gap between purchase days from the last purchase. Confidence is by data points: 1–2 low, 3–4 medium, 5+ high.
- **Trip readiness.** Anything forecast to run out on or before a week after the trip date is added to the list with reason `predicted`, one pack. Below-par and plan needs win over it when they overlap.
- **Shop on purchases.** Ticking a line stores the shop name in the event note, so spend by shop is real rather than guessed from the item's usual shop.
- **Insights** is a page rather than a tab: running out with confidence dots, changed pace (four weeks against the previous four, 30% or more), spend per month with category and shop breakdowns, recipe ruts and forgotten favourites, snack box variety and what came back, and waste with a cost guess from the last price paid. Single-hue bars with text labels; no chart library.
- **Threw away** added to the quick sheet so waste can be logged in one tap.

## 2026-09-05 — Sync hardening after first two-phone day

- A phone sat on "syncing" with 65 changes waiting because one request hung on the mobile network and the run never finished. Every Supabase request now has a 20-second timeout, and a run older than 45 seconds is abandoned and restarted.
- Rows that can never be accepted (foreign key, policy, check or type violations) no longer block the whole outbox: the chunk is retried one row at a time and the refused rows are set aside with the server's message shown in Settings. Rows belonging to a household this phone has left are dropped up front.
- Settings gains "Discard N waiting" as a last resort. Local rows stay; only the send queue is cleared.
- The starter catalogue import waits for a first pull when online, so a second phone cannot seed 124 duplicates before it has seen the first phone's items.
- **Duplicate items** (both phones seeded the catalogue) are merged in the app, not with SQL: the copy with the most history wins, then the oldest; events, list lines, recipe ingredients and snack boxes are pointed at it; the rest are soft-deleted. Settings shows a Merge button whenever duplicates exist and Stock links to it.
