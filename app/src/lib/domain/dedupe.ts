// Duplicate items happen when two phones seed the catalogue at once. Keep the copy with the
// most history (then the oldest), and point everything else at it.
import type { Item, ListLine, MealSlot, RecipeIngredient, StockEvent } from '../db/types'

export interface DedupePlan {
  keepers: Map<string, string> // duplicate id -> keeper id
  remove: Item[]
}

export function planDedupe(items: Item[], events: StockEvent[]): DedupePlan {
  const counts = new Map<string, number>()
  for (const e of events) if (!e.deleted) counts.set(e.item_id, (counts.get(e.item_id) ?? 0) + 1)
  const groups = new Map<string, Item[]>()
  for (const i of items) {
    if (i.deleted || i.archived) continue
    const k = i.name.trim().toLowerCase()
    groups.set(k, [...(groups.get(k) ?? []), i])
  }
  const keepers = new Map<string, string>()
  const remove: Item[] = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.updated_at.localeCompare(b.updated_at))
    const keep = sorted[0]
    for (const dup of sorted.slice(1)) {
      keepers.set(dup.id, keep.id)
      remove.push(dup)
    }
  }
  return { keepers, remove }
}

export function repointEvents(events: StockEvent[], keepers: Map<string, string>): StockEvent[] {
  return events.filter((e) => !e.deleted && keepers.has(e.item_id)).map((e) => ({ ...e, item_id: keepers.get(e.item_id)! }))
}
export function repointLines(lines: ListLine[], keepers: Map<string, string>): ListLine[] {
  return lines.filter((l) => !l.deleted && l.item_id && keepers.has(l.item_id)).map((l) => ({ ...l, item_id: keepers.get(l.item_id!)! }))
}
export function repointIngredients(ings: RecipeIngredient[], keepers: Map<string, string>): RecipeIngredient[] {
  return ings.filter((i) => !i.deleted && i.item_id && keepers.has(i.item_id)).map((i) => ({ ...i, item_id: keepers.get(i.item_id!)! }))
}
export function repointSlots(slots: MealSlot[], keepers: Map<string, string>): MealSlot[] {
  return slots
    .filter((s) => !s.deleted && s.item_ids.some((id) => keepers.has(id)))
    .map((s) => ({ ...s, item_ids: [...new Set(s.item_ids.map((id) => keepers.get(id) ?? id))] }))
}
