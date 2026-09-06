// Insights derived from the ledger and the plan: spend, prices, recipe rotation, snack box, waste.
import type { Item, MealSlot, Recipe, StockEvent } from '../db/types'
import { addDays, weekStart } from './plan'

const dayOf = (iso: string) => iso.slice(0, 10)
export const monthKey = (iso: string) => iso.slice(0, 7)

export interface MonthSpend { month: string; total: number; byCategory: [string, number][]; byShop: [string, number][] }

// Purchases with a price, grouped by month, newest first. Shop comes from the event note
// (the shop it was ticked off under) and falls back to the item's usual shop.
export function spendByMonth(events: StockEvent[], itemsById: Map<string, Item>, today: string, months = 6): MonthSpend[] {
  const out = new Map<string, { total: number; cat: Map<string, number>; shop: Map<string, number> }>()
  for (let i = 0; i < months; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - i, 1)
    out.set(monthKey(d.toISOString()), { total: 0, cat: new Map(), shop: new Map() })
  }
  for (const e of events) {
    if (e.deleted || e.type !== 'bought' || e.price_zar == null) continue
    const m = out.get(monthKey(e.at))
    if (!m) continue
    const item = itemsById.get(e.item_id)
    const cat = item?.category ?? 'other'
    const shop = e.note && e.note.length < 30 ? e.note : item?.preferred_shop ?? 'Anywhere'
    m.total += e.price_zar
    m.cat.set(cat, (m.cat.get(cat) ?? 0) + e.price_zar)
    m.shop.set(shop, (m.shop.get(shop) ?? 0) + e.price_zar)
  }
  const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])
  return [...out.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([month, v]) => ({ month, total: v.total, byCategory: sortDesc(v.cat), byShop: sortDesc(v.shop) }))
}

export interface PricePoint { at: string; price: number; perUnit: number; shop: string | null }

export function priceHistory(events: StockEvent[]): PricePoint[] {
  return events
    .filter((e) => !e.deleted && e.type === 'bought' && e.price_zar != null && e.quantity > 0)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((e) => ({ at: e.at, price: e.price_zar!, perUnit: e.price_zar! / e.quantity, shop: e.note && e.note.length < 30 ? e.note : null }))
}

export interface Rotation { rut: { recipe: Recipe; times: number }[]; forgotten: { recipe: Recipe; lastCooked: string | null }[]; tried: number; ideasAdded: number }

// A rut: cooked three or more times in the last four weeks. Forgotten: rated 4+ and not cooked in eight weeks.
export function recipeRotation(recipes: Recipe[], slots: MealSlot[], today: string): Rotation {
  const since4 = addDays(today, -28)
  const since8 = addDays(today, -56)
  const cooked = slots.filter((s) => !s.deleted && s.recipe_id && s.status === 'cooked')
  const recent = new Map<string, number>()
  const last = new Map<string, string>()
  for (const s of cooked) {
    if (s.date >= since4) recent.set(s.recipe_id!, (recent.get(s.recipe_id!) ?? 0) + 1)
    if ((last.get(s.recipe_id!) ?? '') < s.date) last.set(s.recipe_id!, s.date)
  }
  const rut = recipes.filter((r) => (recent.get(r.id) ?? 0) >= 3).map((r) => ({ recipe: r, times: recent.get(r.id)! })).sort((a, b) => b.times - a.times)
  const forgotten = recipes
    .filter((r) => (r.rating?.household ?? 0) >= 4 && (last.get(r.id) ?? '') < since8)
    .map((r) => ({ recipe: r, lastCooked: last.get(r.id) ?? null }))
    .sort((a, b) => (a.lastCooked ?? '').localeCompare(b.lastCooked ?? ''))
  const tried = slots.filter((s) => !s.deleted && s.status === 'cooked' && s.free_text?.startsWith('Idea:') && s.date >= since8).length
  return { rut, forgotten, tried, ideasAdded: 0 }
}

export interface WeekVariety { week: string; unique: number; total: number; score: number }

export function snackVariety(slots: MealSlot[], today: string, weeks = 4): WeekVariety[] {
  const start = weekStart(addDays(today, -7 * (weeks - 1)))
  const byWeek = new Map<string, string[]>()
  for (const s of slots) {
    if (s.deleted || s.slot !== 'school_snackbox' || s.date < start || s.date > today) continue
    const w = weekStart(s.date)
    byWeek.set(w, [...(byWeek.get(w) ?? []), ...s.item_ids])
  }
  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, ids]) => ({ week, unique: new Set(ids).size, total: ids.length, score: ids.length ? new Set(ids).size / ids.length : 0 }))
}

export function cameBack(slots: MealSlot[], today: string, days = 28): { date: string; notes: string }[] {
  const since = addDays(today, -days)
  return slots
    .filter((s) => !s.deleted && s.slot === 'school_snackbox' && s.notes && s.date >= since)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => ({ date: s.date, notes: s.notes! }))
}

export interface WasteLine { item: Item; quantity: number; cost: number | null }

// What was thrown out, with a cost guess from the last price paid or the typical price.
export function waste(events: StockEvent[], itemsById: Map<string, Item>, today: string, days = 28): { lines: WasteLine[]; total: number } {
  const since = addDays(today, -days)
  const qty = new Map<string, number>()
  for (const e of events) if (!e.deleted && e.type === 'wasted' && dayOf(e.at) >= since) qty.set(e.item_id, (qty.get(e.item_id) ?? 0) + e.quantity)
  const lines: WasteLine[] = []
  let total = 0
  for (const [id, q] of qty) {
    const item = itemsById.get(id)
    if (!item) continue
    const lastPrice = priceHistory(events.filter((e) => e.item_id === id))[0]
    const perUnit = lastPrice ? lastPrice.perUnit : item.typical_price_zar != null ? item.typical_price_zar / (item.pack_size || 1) : null
    const cost = perUnit == null ? null : Math.round(perUnit * q)
    if (cost != null) total += cost
    lines.push({ item, quantity: q, cost })
  }
  return { lines: lines.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)), total }
}
