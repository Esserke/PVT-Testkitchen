// Row types mirror supabase/migrations/0001_schema.sql. Every synced row carries
// id, household_id, updated_at (server-stamped) and deleted (soft delete).

export interface Synced {
  id: string
  household_id: string
  updated_at: string
  deleted: boolean
}

export type TrackingMode = 'count' | 'level' | 'cycle'
export const SNACK_COMPONENTS = ['fruit', 'veg', 'protein', 'carb', 'treat', 'drink'] as const
export type SnackComponent = (typeof SNACK_COMPONENTS)[number]
export type ItemSource = 'bought' | 'farm'

export interface Item extends Synced {
  name: string
  aliases: string[]
  category: string
  location: string
  unit: string
  pack_size: number
  par_level: number | null
  tracking_mode: TrackingMode
  preferred_shop: string | null
  typical_price_zar: number | null
  bulk_ok: boolean
  source: ItemSource
  perishable_days: number | null
  snackbox_ok: boolean
  snack_component: SnackComponent | null
  kid_ok: boolean
  archived: boolean
}

export type StockEventType = 'bought' | 'used' | 'finished' | 'count' | 'produced' | 'wasted' | 'adjust'
export type CaptureSource = 'tap' | 'text' | 'photo' | 'receipt' | 'shopping' | 'plan' | 'qr'

export interface StockEvent extends Synced {
  item_id: string
  type: StockEventType
  quantity: number
  at: string
  by_member: string | null
  source: CaptureSource | null
  note: string | null
  price_zar: number | null
  capture_id: string | null
}

export interface Capture extends Synced {
  kind: 'text' | 'shelf_photo' | 'receipt' | 'voice'
  raw_text: string | null
  photo_path: string | null
  location: string | null
  proposed: unknown
  status: 'pending' | 'confirmed' | 'dismissed'
  created_at: string
  by_member: string | null
}

export interface Recipe extends Synced {
  title: string
  servings: number | null
  prep_minutes: number | null
  cook_minutes: number | null
  steps: string | null
  source_url: string | null
  photo_path: string | null
  tags: string[]
  rating: Record<string, number>
  daughter_verdict: 'ate' | 'picked' | 'refused' | null
}

export interface RecipeIngredient extends Synced {
  recipe_id: string
  item_id: string | null
  free_text: string | null
  quantity: number | null
  unit: string | null
  optional: boolean
}

export interface Idea extends Synced {
  title: string
  source_url: string | null
  photo_path: string | null
  added_by: string | null
  why: string | null
  tags: string[]
  status: 'idea' | 'scheduled' | 'cooked' | 'dropped'
  created_at: string
}

export type MealSlotName = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'school_snackbox'

export interface MealSlot extends Synced {
  date: string
  slot: MealSlotName
  recipe_id: string | null
  free_text: string | null
  servings: number | null
  for_members: string[]
  item_ids: string[]
  status: 'planned' | 'cooked' | 'skipped' | 'swapped'
  notes: string | null
}

export interface Trip extends Synced {
  planned_date: string | null
  shops: string[]
  status: 'open' | 'done'
}

export interface ListLine extends Synced {
  trip_id: string
  item_id: string | null
  free_text: string | null
  quantity: number | null
  reason: 'below_par' | 'plan' | 'predicted' | 'manual'
  shop: string | null
  checked: boolean
  price_paid_zar: number | null
  event_id: string | null
}

export interface SchoolTerm extends Synced {
  term_start: string
  term_end: string
  label: string | null
}

export const SYNCED_TABLES = [
  'item',
  'stock_event',
  'capture',
  'recipe',
  'recipe_ingredient',
  'idea',
  'meal_slot',
  'trip',
  'list_line',
  'school_calendar',
] as const

export type SyncedTable = (typeof SYNCED_TABLES)[number]

export interface OutboxEntry {
  id?: number
  table: SyncedTable
  row_id: string
  ts: number
}

export interface MetaEntry {
  key: string
  value: string
}
