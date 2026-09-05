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

export type AutoReason = 'below_par' | 'plan'
export interface Need { item: Item; quantity: number; reason: AutoReason }

// Combine below-par needs with plan needs: one line per item, the larger quantity,
// and "plan" wins as the reason because it explains why.
export function mergeNeeds(belowPar: { item: Item; quantity: number }[], plan: { item: Item; quantity: number }[]): Need[] {
  const m = new Map<string, Need>()
  for (const n of belowPar) m.set(n.item.id, { ...n, reason: 'below_par' })
  for (const n of plan) {
    const cur = m.get(n.item.id)
    m.set(n.item.id, { item: n.item, quantity: Math.max(n.quantity, cur?.quantity ?? 0), reason: 'plan' })
  }
  return [...m.values()]
}

export interface ListDiff {
  add: Need[]
  remove: ListLine[]
  update: ListLine[]
}

// Reconcile the automatic lines on a trip with what is needed now.
// Manual lines and anything already ticked are left alone.
export function reconcile(lines: ListLine[], needed: Need[]): ListDiff {
  const live = lines.filter((l) => !l.deleted)
  const byItem = new Map(live.filter((l) => l.item_id).map((l) => [l.item_id as string, l]))
  const neededById = new Map(needed.map((n) => [n.item.id, n]))
  const update: ListLine[] = []
  for (const l of live) {
    if (l.checked || !l.item_id || l.reason === 'manual' || l.reason === 'predicted') continue
    const n = neededById.get(l.item_id)
    if (n && ((l.quantity ?? 0) < n.quantity || l.reason !== n.reason)) update.push({ ...l, quantity: Math.max(l.quantity ?? 0, n.quantity), reason: n.reason })
  }
  return {
    add: needed.filter((n) => !byItem.has(n.item.id)),
    remove: live.filter((l) => (l.reason === 'below_par' || l.reason === 'plan') && !l.checked && l.item_id && !neededById.has(l.item_id)),
    update,
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
