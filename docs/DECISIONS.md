# Decisions

## 2026-09-05 — Phase 0

- **Backend: Supabase**, confirmed by Kevin. Local-only mode kept as a fallback when the keys are absent.
- **Stack**: Vite 8, Svelte 5 (runes), TypeScript, `vite-plugin-pwa`, Dexie 4, `@supabase/supabase-js` 2. GitHub Pages hosting via Actions.
- **Sync model**: local-first outbox. Server stamps `updated_at` with a trigger so per-table pull cursors stay monotonic. Rows with a pending local write are not overwritten by a pull. Realtime `postgres_changes` only nudges a sync; it is not the source of truth.
- **Membership**: `member.auth_user_id` links a Supabase auth user to a household. RLS policies call `my_household_ids()`. Onboarding runs through two `security definer` functions so no client ever inserts into `household` or `member` directly.
- **Routing**: hash routes, so GitHub Pages needs no rewrite rules.
- **Starter catalogue**: `app/src/data/items.csv`, 124 items drafted from nine kitchen photos (fridge, freezer drawers, chest freezer, under-sink cupboard, two pantry cupboards, water store, drinks fridge). Par levels are first guesses to be corrected in use. New locations added: chest freezer, drinks fridge, under sink.
- **Not in Phase 0**: stock events, shopping list, any Claude calls. Those are Phase 1 and Phase 3.
