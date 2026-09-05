import type { Item, ListLine } from '../db/types'
import { suggestedQuantity, type ItemStock } from './stock'

// Which items should be on the list right now, and how many packs.
export function belowParItems(items: Item[], stock: Map<string, ItemStock>): { item: Item; quantity: number }[] {
  return items
    .filter((i) => !i.deleted && !i.archived && i.tracking_mode !== 'cycle')
    .map((i) => ({ item: i, s: stock.get(i.id) }))
    .filter(({ s }) => s && (s.status === 'low' || s.status === 'out'))
    .map(({ item, s }) => ({ item, quantity: suggestedQuantity(item, s!.stock) }))
}

export interface ListDiff {
  add: { item: Item; quantity: number }[]
  remove: ListLine[]
}

// Reconcile the automatic (below_par) lines on a trip with the current stock.
// Manual lines and anything already ticked are left alone.
export function reconcile(lines: ListLine[], needed: { item: Item; quantity: number }[]): ListDiff {
  const live = lines.filter((l) => !l.deleted)
  const onList = new Set(live.filter((l) => l.item_id).map((l) => l.item_id as string))
  const neededIds = new Set(needed.map((n) => n.item.id))
  return {
    add: needed.filter((n) => !onList.has(n.item.id)),
    remove: live.filter((l) => l.reason === 'below_par' && !l.checked && l.item_id && !neededIds.has(l.item_id)),
  }
}

export function groupByShop<T extends { shop: string | null }>(lines: T[]): [string, T[]][] {
  const m = new Map<string, T[]>()
  for (const l of lines) {
    const k = l.shop ?? 'Anywhere'
    m.set(k, [...(m.get(k) ?? []), l])
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}
