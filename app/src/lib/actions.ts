// The verbs of the app. Each writes one or more ledger rows through the repo.
import { put, newId, nowIso, softDelete } from './db/repo'
import { household } from './household.svelte'
import type { Capture, CaptureSource, Idea, Item, ListLine, MealSlot, MealSlotName, Recipe, RecipeIngredient, StockEvent, StockEventType, Trip } from './db/types'
import { cookedDeductions, addDays } from './domain/plan'

function base() {
  if (!household.id) throw new Error('No household')
  return { id: newId(), household_id: household.id, updated_at: '', deleted: false }
}

export async function recordEvent(
  item: Item,
  type: StockEventType,
  quantity: number,
  opts: { source?: CaptureSource; note?: string; price_zar?: number | null; capture_id?: string } = {},
): Promise<StockEvent> {
  const row: StockEvent = {
    ...base(),
    item_id: item.id,
    type,
    quantity,
    at: nowIso(),
    by_member: household.memberId,
    source: opts.source ?? 'tap',
    note: opts.note ?? null,
    price_zar: opts.price_zar ?? null,
    capture_id: opts.capture_id ?? null,
  }
  return put('stock_event', row)
}

export const markFinished = (item: Item) => recordEvent(item, 'finished', 0)
export const setCount = (item: Item, qty: number) => recordEvent(item, 'count', qty)
export const setLevel = (item: Item, level: number) => recordEvent(item, 'count', level)
export const useOne = (item: Item, qty = 1) => recordEvent(item, 'used', qty)
export const bought = (item: Item, packs: number, price: number | null = null, source: CaptureSource = 'shopping', shop?: string) =>
  recordEvent(item, 'bought', packs * (item.pack_size || 1), { price_zar: price, source, note: shop })
export const wasted = (item: Item, qty = 1) => recordEvent(item, 'wasted', qty)
export const produced = (item: Item, qty: number) => recordEvent(item, 'produced', qty)

export const undoEvent = (id: string) => softDelete('stock_event', id)

export async function saveItem(item: Item): Promise<Item> {
  return put('item', item)
}

export async function newTrip(planned_date: string | null): Promise<Trip> {
  return put('trip', { ...base(), planned_date, shops: [], status: 'open' })
}

export async function addLine(trip: Trip, line: Omit<ListLine, keyof ReturnType<typeof base> | 'trip_id'>): Promise<ListLine> {
  return put('list_line', { ...base(), trip_id: trip.id, ...line })
}

export async function saveLine(line: ListLine): Promise<ListLine> {
  return put('list_line', line)
}

export async function closeTrip(trip: Trip): Promise<Trip> {
  return put('trip', { ...trip, status: 'done' })
}

export async function captureText(text: string): Promise<Capture> {
  return put('capture', {
    ...base(),
    kind: 'text',
    raw_text: text,
    photo_path: null,
    location: null,
    proposed: null,
    status: 'pending',
    created_at: nowIso(),
    by_member: household.memberId,
  })
}

export async function saveCapture(c: Capture): Promise<Capture> {
  return put('capture', c)
}

// ------------------------------------------------------------ recipes, ideas, plan

export const saveRecipe = (r: Recipe) => put('recipe', r)
export async function newRecipe(title: string, source_url: string | null = null): Promise<Recipe> {
  return put('recipe', { ...base(), title, servings: 3, prep_minutes: null, cook_minutes: null, steps: null, source_url, photo_path: null, tags: [], rating: {}, daughter_verdict: null })
}
export const saveIngredient = (i: RecipeIngredient) => put('recipe_ingredient', i)
export function blankIngredient(recipe_id: string): RecipeIngredient {
  return { ...base(), recipe_id, item_id: null, free_text: null, quantity: null, unit: null, optional: false }
}
export const deleteIngredient = (id: string) => softDelete('recipe_ingredient', id)

export const saveIdea = (i: Idea) => put('idea', i)
export async function newIdea(title: string, source_url: string | null, why: string | null): Promise<Idea> {
  return put('idea', { ...base(), title, source_url, photo_path: null, added_by: household.memberId, why, tags: [], status: 'idea', created_at: nowIso() })
}

export const saveSlot = (s: MealSlot) => put('meal_slot', s)
export function blankSlot(date: string, slot: MealSlotName): MealSlot {
  return { ...base(), date, slot, recipe_id: null, free_text: null, servings: 3, for_members: [], item_ids: [], status: 'planned', notes: null }
}
export async function upsertSlot(existing: MealSlot | undefined, date: string, slot: MealSlotName, patch: Partial<MealSlot>): Promise<MealSlot> {
  return saveSlot({ ...(existing ?? blankSlot(date, slot)), ...patch })
}
export const clearSlot = (s: MealSlot) => softDelete('meal_slot', s.id)

// Cooking deducts count-tracked ingredients and marks the slot cooked.
export async function cookSlot(slot: MealSlot, recipe: Recipe | null, ingredients: RecipeIngredient[], itemsById: Map<string, Item>): Promise<number> {
  const deductions = cookedDeductions(slot, recipe, ingredients, itemsById)
  for (const d of deductions) await recordEvent(d.item, 'used', d.quantity, { source: 'plan', note: recipe?.title ?? slot.free_text ?? undefined })
  await saveSlot({ ...slot, status: 'cooked' })
  return deductions.length
}

export async function leftoversTomorrow(slot: MealSlot, title: string, existingTomorrow: MealSlot | undefined): Promise<MealSlot> {
  return upsertSlot(existingTomorrow, addDays(slot.date, 1), 'lunch', { recipe_id: null, item_ids: [], free_text: `Leftover ${title}`, notes: 'leftovers', status: 'planned' })
}
