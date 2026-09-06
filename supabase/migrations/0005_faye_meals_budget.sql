-- Larder: the child's own food record, health metrics, and a monthly budget.

create table if not exists child_meal (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast','lunch','dinner','snack','school_snackbox')),
  description text,
  item_ids uuid[] not null default '{}',
  eaten text check (eaten in ('all','most','some','little','none')),
  fruit_veg int not null default 0,
  protein boolean not null default false,
  notes text,
  at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists child_meal_date_idx on child_meal(household_id, date);

create table if not exists child_metric (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('weight_kg','height_cm','note')),
  value numeric,
  text_value text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists budget (
  id uuid primary key,
  household_id uuid not null references household(id) on delete cascade,
  category text not null default 'all',
  monthly_zar numeric not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

do $$
declare t text;
begin
  foreach t in array array['child_meal','child_metric','budget'] loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before insert or update on %I for each row execute function set_updated_at()', t, t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_all on %I', t, t);
    execute format('create policy %I_all on %I for all using (household_id in (select my_household_ids())) with check (household_id in (select my_household_ids()))', t, t);
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
