-- Larder: per-item verdicts on the school snack box (ate / some / left), keyed by item id.
alter table meal_slot add column if not exists item_verdicts jsonb not null default '{}';
