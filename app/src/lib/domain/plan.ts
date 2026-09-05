// Meal planning maths: weeks, ingredient needs, cooking deductions, snack boxes.
import type { Item, MealSlot, MealSlotName, Recipe, RecipeIngredient, SnackComponent } from '../db/types'
import { SNACK_COMPONENTS } from '../db/types'
import type { ItemStock } from './stock'

export const SLOTS: { slot: MealSlotName; label: string }[] = [
  { slot: 'breakfast', label: 'Breakfast' },
  { slot: 'school_snackbox', label: 'Snack box' },
  { slot: 'lunch', label: 'Lunch' },
  { slot: 'snack', label: 'Snack' },
  { slot: 'dinner', label: 'Dinner' },
]

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function addDays(iso: string, n: number): string {
  const d = fromIsoDate(iso)
  d.setDate(d.getDate() + n)
  return toIsoDate(d)
}
// Monday-start week containing the date.
export function weekStart(iso: string): string {
  const d = fromIsoDate(iso)
  const dow = (d.getDay() + 6) % 7
  return addDays(iso, -dow)
}
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
// School is every weekday (Kevin, 2026-09-05). No term calendar yet.
export function isSchoolDay(iso: string): boolean {
  const dow = fromIsoDate(iso).getDay()
  return dow >= 1 && dow <= 5
}
export function slotsForDay(iso: string): MealSlotName[] {
  return SLOTS.map((s) => s.slot).filter((s) => s !== 'school_snackbox' || isSchoolDay(iso))
}

// ---------------------------------------------------------------- units
const MASS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000 }
const VOLUME: Record<string, number> = { ml: 1, millilitre: 1, l: 1000, litre: 1000, litres: 1000 }
export function convert(qty: number, from: string, to: string): number | null {
  const f = from.trim().toLowerCase()
  const t = to.trim().toLowerCase()
  if (f === t || f === t + 's' || t === f + 's') return qty
  if (f in MASS && t in MASS) return (qty * MASS[f]) / MASS[t]
  if (f in VOLUME && t in VOLUME) return (qty * VOLUME[f]) / VOLUME[t]
  return null
}

// How much of each item a recipe needs at a given number of servings, in item units.
// Ingredients whose unit cannot be converted count as "needs one" so they still reach the list.
export function recipeNeeds(recipe: Recipe, ingredients: RecipeIngredient[], itemsById: Map<string, Item>, servings: number | null): Map<string, number> {
  const scale = recipe.servings && servings ? servings / recipe.servings : 1
  const out = new Map<string, number>()
  for (const ing of ingredients) {
    if (ing.deleted || !ing.item_id || ing.optional) continue
    const item = itemsById.get(ing.item_id)
    if (!item) continue
    let qty: number | null = null
    if (ing.quantity != null && ing.unit) qty = convert(ing.quantity * scale, ing.unit, item.unit)
    else if (ing.quantity != null && !ing.unit) qty = ing.quantity * scale
    const need = qty ?? Math.min(1, item.pack_size || 1)
    out.set(item.id, (out.get(item.id) ?? 0) + need)
  }
  return out
}

// Everything the planned meals in [from, to] need, summed per item.
export function planNeeds(
  slots: MealSlot[],
  recipesById: Map<string, Recipe>,
  ingredientsByRecipe: Map<string, RecipeIngredient[]>,
  itemsById: Map<string, Item>,
  from: string,
  to: string,
): Map<string, number> {
  const out = new Map<string, number>()
  const add = (id: string, q: number) => out.set(id, (out.get(id) ?? 0) + q)
  for (const s of slots) {
    if (s.deleted || s.status !== 'planned' || s.date < from || s.date > to) continue
    if (s.recipe_id) {
      const r = recipesById.get(s.recipe_id)
      if (r) for (const [id, q] of recipeNeeds(r, ingredientsByRecipe.get(r.id) ?? [], itemsById, s.servings)) add(id, q)
    }
    for (const id of s.item_ids) if (itemsById.has(id)) add(id, 1)
  }
  return out
}

// Turn needs minus stock into list lines, in whole packs.
export function planLines(needs: Map<string, number>, itemsById: Map<string, Item>, stock: Map<string, ItemStock>): { item: Item; quantity: number }[] {
  const out: { item: Item; quantity: number }[] = []
  for (const [id, need] of needs) {
    const item = itemsById.get(id)
    if (!item || item.archived || item.tracking_mode === 'cycle') continue
    const s = stock.get(id)
    const have = item.tracking_mode === 'level' ? (s?.stock == null ? 0 : s.stock > 0.25 ? need : 0) : (s?.stock ?? 0)
    const short = need - have
    if (short <= 0) continue
    out.push({ item, quantity: Math.max(1, Math.ceil(short / (item.pack_size || 1))) })
  }
  return out
}

// What to deduct when a meal is cooked.
export function cookedDeductions(slot: MealSlot, recipe: Recipe | null, ingredients: RecipeIngredient[], itemsById: Map<string, Item>): { item: Item; quantity: number }[] {
  const out: { item: Item; quantity: number }[] = []
  if (recipe) {
    for (const [id, q] of recipeNeeds(recipe, ingredients, itemsById, slot.servings)) {
      const item = itemsById.get(id)!
      if (item.tracking_mode === 'count') out.push({ item, quantity: q })
    }
  }
  for (const id of slot.item_ids) {
    const item = itemsById.get(id)
    if (item && item.tracking_mode === 'count') out.push({ item, quantity: 1 })
  }
  return out
}

// ------------------------------------------------------------ snack boxes
export type SnackPools = Record<SnackComponent, Item[]>

export function snackPools(items: Item[]): SnackPools {
  const pools = Object.fromEntries(SNACK_COMPONENTS.map((c) => [c, [] as Item[]])) as SnackPools
  for (const i of items) if (!i.archived && !i.deleted && i.snackbox_ok && i.snack_component) pools[i.snack_component].push(i)
  return pools
}

// Fill one box per school day: one item per component, no repeats within the week,
// preferring items used least recently. Existing boxes are kept.
export function fillSnackBoxes(
  days: string[],
  pools: SnackPools,
  existing: Map<string, string[]>,
  lastUsed: Map<string, string>,
  stock?: Map<string, ItemStock>,
): Map<string, string[]> {
  const out = new Map(existing)
  const usedThisWeek = new Set([...existing.values()].flat())
  for (const day of days) {
    if (!isSchoolDay(day) || (existing.get(day)?.length ?? 0) > 0) continue
    const box: string[] = []
    for (const c of SNACK_COMPONENTS) {
      const pool = pools[c].filter((i) => stock?.get(i.id)?.status !== 'out')
      if (!pool.length) continue
      const fresh = pool.filter((i) => !usedThisWeek.has(i.id))
      const pick = (fresh.length ? fresh : pool).sort((a, b) => (lastUsed.get(a.id) ?? '').localeCompare(lastUsed.get(b.id) ?? '') || a.name.localeCompare(b.name))[0]
      box.push(pick.id)
      usedThisWeek.add(pick.id)
    }
    out.set(day, box)
  }
  return out
}

// Dinner suggestions: favourites not cooked recently, kid-friendly first.
export function suggestDinners(recipes: Recipe[], lastCooked: Map<string, string>, count: number, exclude: Set<string>): Recipe[] {
  return recipes
    .filter((r) => !r.deleted && !exclude.has(r.id))
    .sort((a, b) => {
      const ra = a.rating?.household ?? 3
      const rb = b.rating?.household ?? 3
      const la = lastCooked.get(a.id) ?? ''
      const lb = lastCooked.get(b.id) ?? ''
      return la.localeCompare(lb) || rb - ra || a.title.localeCompare(b.title)
    })
    .slice(0, count)
}

export function lastCookedByRecipe(slots: MealSlot[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of slots) {
    if (s.deleted || !s.recipe_id || s.status !== 'cooked') continue
    if ((m.get(s.recipe_id) ?? '') < s.date) m.set(s.recipe_id, s.date)
  }
  return m
}
