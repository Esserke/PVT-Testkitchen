-- Larder: Phase 0 schema. Run in the Supabase SQL editor or with `supabase db push`.
-- Every synced table has id, household_id, updated_at (server-stamped) and deleted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- households
create table if not exists household (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(encode(gen_random_bytes(6), 'hex'), 1, 8),
  created_at timestamptz not null default now()
);

create table if not exists member (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null default 'adult',
  birthdate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists member_auth_user_idx on member(auth_user_id);

-- Which households does the signed-in user belong to? Used by every RLS policy.
create or replace function my_household_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select household_id from member where auth_user_id = auth.uid() and not deleted
$$;

-- ------------------------------------------------------------- synced tables
create table if not exists item (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  category text not null,
  location text not null,
  unit text not null,
  pack_size numeric not null default 1,
  par_level numeric,
  tracking_mode text not null default 'count' check (tracking_mode in ('count','level','cycle')),
  preferred_shop text,
  typical_price_zar numeric,
  bulk_ok boolean not null default false,
  source text not null default 'bought' check (source in ('bought','farm')),
  perishable_days int,
  snackbox_ok boolean not null default false,
  kid_ok boolean not null default true,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists stock_event (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  item_id uuid not null references item(id) on delete cascade,
  type text not null check (type in ('bought','used','finished','count','produced','wasted','adjust')),
  quantity numeric not null,
  at timestamptz not null default now(),
  by_member uuid references member(id),
  source text,
  note text,
  price_zar numeric,
  capture_id uuid,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists stock_event_item_at_idx on stock_event(item_id, at);

create table if not exists capture (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  kind text not null,
  raw_text text,
  photo_path text,
  location text,
  proposed jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  by_member uuid references member(id),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists recipe (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  title text not null,
  servings int,
  prep_minutes int,
  cook_minutes int,
  steps text,
  source_url text,
  photo_path text,
  tags text[] not null default '{}',
  rating jsonb not null default '{}',
  daughter_verdict text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists recipe_ingredient (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  recipe_id uuid not null references recipe(id) on delete cascade,
  item_id uuid references item(id),
  free_text text,
  quantity numeric,
  unit text,
  optional boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists idea (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  title text not null,
  source_url text,
  photo_path text,
  added_by uuid references member(id),
  why text,
  tags text[] not null default '{}',
  status text not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists meal_slot (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast','lunch','dinner','snack','school_snackbox')),
  recipe_id uuid references recipe(id),
  free_text text,
  servings int,
  for_members uuid[] not null default '{}',
  status text not null default 'planned',
  notes text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists meal_slot_date_idx on meal_slot(household_id, date);

create table if not exists trip (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  planned_date date,
  shops text[] not null default '{}',
  status text not null default 'open',
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists list_line (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  trip_id uuid not null references trip(id) on delete cascade,
  item_id uuid references item(id),
  free_text text,
  quantity numeric,
  reason text not null default 'manual',
  shop text,
  checked boolean not null default false,
  price_paid_zar numeric,
  event_id uuid references stock_event(id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists school_calendar (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  term_start date not null,
  term_end date not null,
  label text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- ------------------------------------------------- server-stamped updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['member','item','stock_event','capture','recipe','recipe_ingredient','idea','meal_slot','trip','list_line','school_calendar'] loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before insert or update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------- RLS
alter table household enable row level security;
alter table member enable row level security;

drop policy if exists household_select on household;
create policy household_select on household for select using (id in (select my_household_ids()));

drop policy if exists member_select on member;
create policy member_select on member for select using (household_id in (select my_household_ids()));
drop policy if exists member_update on member;
create policy member_update on member for update using (household_id in (select my_household_ids()));

do $$
declare t text;
begin
  foreach t in array array['item','stock_event','capture','recipe','recipe_ingredient','idea','meal_slot','trip','list_line','school_calendar'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_all on %I', t, t);
    execute format(
      'create policy %I_all on %I for all using (household_id in (select my_household_ids())) with check (household_id in (select my_household_ids()))',
      t, t);
  end loop;
end $$;

-- ------------------------------------------------------- household onboarding
create or replace function create_household(p_name text, p_member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into household(name) values (p_name) returning id into h;
  insert into member(household_id, auth_user_id, name) values (h, auth.uid(), p_member_name);
  return h;
end $$;

create or replace function join_household(p_code text, p_member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into h from household where invite_code = lower(trim(p_code));
  if h is null then raise exception 'no household with that invite code'; end if;
  if exists (select 1 from member where household_id = h and auth_user_id = auth.uid()) then return h; end if;
  insert into member(household_id, auth_user_id, name) values (h, auth.uid(), p_member_name);
  return h;
end $$;

revoke all on function create_household(text, text) from public, anon;
revoke all on function join_household(text, text) from public, anon;
grant execute on function create_household(text, text) to authenticated;
grant execute on function join_household(text, text) to authenticated;

-- -------------------------------------------------------------------- realtime
do $$
declare t text;
begin
  foreach t in array array['item','stock_event','capture','recipe','recipe_ingredient','idea','meal_slot','trip','list_line','school_calendar'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
