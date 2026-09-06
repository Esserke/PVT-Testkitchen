-- Larder: one row per call to the reading function, for the daily cap and the spend estimate.
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  member_id uuid references member(id),
  kind text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_household_created_idx on ai_usage(household_id, created_at);
alter table ai_usage enable row level security;
drop policy if exists ai_usage_select on ai_usage;
create policy ai_usage_select on ai_usage for select using (household_id in (select my_household_ids()));
-- Inserts come only from the edge function, which uses the service role.
