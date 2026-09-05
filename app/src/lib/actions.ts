// The verbs of the app. Each writes one or more ledger rows through the repo.
import { put, newId, nowIso, softDelete } from './db/repo'
import { household } from './household.svelte'
import type { Capture, CaptureSource, Item, ListLine, StockEvent, StockEventType, Trip } from './db/types'

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
export const bought = (item: Item, packs: number, price: number | null = null, source: CaptureSource = 'shopping') =>
  recordEvent(item, 'bought', packs * (item.pack_size || 1), { price_zar: price, source })
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
