# Setup

One-time steps to get Larder running on two phones. About 20 minutes.

## 1. Supabase project

1. Create a project at https://supabase.com (free tier). Pick a region close to South Africa; `eu-west` is fine.
2. In the dashboard open **SQL Editor** and run each file in `supabase/migrations/` in order (`0001_…`, then `0002_…`). It creates the tables, row-level security, the two onboarding functions and turns on realtime.
   Alternatively, with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. **Authentication → Providers → Email**: leave Email enabled, turn on *Magic Link* (it is on by default). Turn off *Confirm email* if you want the first sign-in to be a single click.
4. **Authentication → URL Configuration**: add your GitHub Pages URL (see step 3 below) to *Redirect URLs*, and `http://localhost:5173` for development.
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key.

## 2. Local development

```bash
cd app
cp .env.example .env.local     # paste the URL and anon key
npm install
npm run dev                    # http://localhost:5173
```

Leave the two keys empty and the app runs in local-only mode with no sign-in and no sync.

## 3. GitHub Pages deploy

1. In the repository go to **Settings → Pages** and set *Source* to **GitHub Actions**.
2. The project URL and anon key are set as defaults in `.github/workflows/deploy.yml` (the anon key is designed to be public; row-level security protects the data). To point at a different project, add repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Variables**; they override the defaults.
3. Merge to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to `https://<user>.github.io/<repo>/`.

## 4. Phones

1. Open the Pages URL in Chrome (Android) or Safari (iPhone).
2. Sign in with your email, tap the link in the email on the same phone.
3. First phone: **Create** the household. Second phone: **Join** with the invite code shown under Settings on the first phone.
4. Add to home screen: Chrome menu → *Install app*; Safari share sheet → *Add to Home Screen*.
5. On the Stock tab tap **Load starter catalogue** once. It adds the items drafted from the kitchen photos; the other phone receives them within a few seconds.

## Phase 0 acceptance check

Put one phone in flight mode, add an item on it, take it out of flight mode. The item should appear on the other phone without anyone refreshing.

## 5. Reading photos and notes (Phase 3)

The reading function needs two GitHub repository secrets (Settings → Secrets and variables → Actions → Secrets):

- `ANTHROPIC_API_KEY` from console.anthropic.com (prepaid credit required)
- `SUPABASE_ACCESS_TOKEN` from https://supabase.com/dashboard/account/tokens

Run `supabase/migrations/0004_ai_usage.sql` in the SQL editor. The workflow `Deploy Supabase functions` then publishes the function on merge; it can also be run by hand from the Actions tab. Reads are capped at 60 per household per day; usage and an estimated cost appear under Settings.

## 6. Notifications (optional)

Add a third GitHub repository secret, `SUPABASE_SERVICE_ROLE_KEY`, copied from the Supabase API keys page (the `service_role` key, next to the anon key). The `Daily nudge` workflow uses it to ask the `notify` function to send anything due at 15:00 UTC. Without it the workflow skips quietly and nothing else is affected.

Run `supabase/migrations/0006_push.sql` in the SQL editor, then on each phone open Settings and tap "Turn on for this phone". The phone must have the app installed to the home screen. Send a test from the same card to confirm.
