// Live view of the ledger: every item with its derived stock. Shared by all screens.
import { liveQuery, type Subscription } from 'dexie'
import { db } from './db/schema'
import type { Item, StockEvent } from './db/types'
import { summarise, type ItemStock } from './domain/stock'

export const stockState = $state<{ items: Item[]; events: StockEvent[]; ready: boolean }>({ items: [], events: [], ready: false })

let subs: Subscription[] = []
let current: string | null = null

export function watchStock(householdId: string | null): void {
  if (householdId === current) return
  current = householdId
  for (const s of subs) s.unsubscribe()
  subs = []
  stockState.ready = false
  if (!householdId) return
  subs.push(
    liveQuery(() => db.item.where('household_id').equals(householdId).filter((i) => !i.deleted).sortBy('name')).subscribe((rows) => {
      stockState.items = rows
      stockState.ready = true
    }),
    liveQuery(() => db.stock_event.where('household_id').equals(householdId).toArray()).subscribe((rows) => {
      stockState.events = rows
    }),
  )
}

export function eventsByItem(events: StockEvent[]): Map<string, StockEvent[]> {
  const m = new Map<string, StockEvent[]>()
  for (const e of events) m.set(e.item_id, [...(m.get(e.item_id) ?? []), e])
  return m
}

export function stockMap(items: Item[], events: StockEvent[]): Map<string, ItemStock> {
  const by = eventsByItem(events)
  return new Map(items.map((i) => [i.id, summarise(i, by.get(i.id) ?? [])]))
}
