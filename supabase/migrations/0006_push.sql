-- Larder: web push. Subscriptions per device, VAPID keys held server-side, and a log
-- so the same nudge is never sent twice in a day.

create table if not exists push_subscription (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  member_id uuid references member(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  label text,
  created_at timestamptz not null default now(),
  failed_at timestamptz
);
create index if not exists push_subscription_household_idx on push_subscription(household_id);

-- Written and read only by the edge function (service role). No policies, so RLS denies everyone else.
create table if not exists push_config (
  id int primary key default 1,
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now(),
  constraint push_config_single check (id = 1)
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  kind text not null,
  on_date date not null,
  sent_at timestamptz not null default now(),
  unique (household_id, kind, on_date)
);

alter table push_subscription enable row level security;
alter table push_config enable row level security;
alter table notification_log enable row level security;

drop policy if exists push_subscription_all on push_subscription;
create policy push_subscription_all on push_subscription for all
  using (household_id in (select my_household_ids())) with check (household_id in (select my_household_ids()));

drop policy if exists notification_log_select on notification_log;
create policy notification_log_select on notification_log for select using (household_id in (select my_household_ids()));
