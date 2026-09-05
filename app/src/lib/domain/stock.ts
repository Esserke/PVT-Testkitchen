// Pure stock maths. Current stock is derived from the event ledger:
// the latest `count` (or `finished`) fixes an absolute level, later deltas move it.
import type { Item, StockEvent, StockEventType } from '../db/types'

export const LEVELS = [
  { value: 1, label: 'full' },
  { value: 0.5, label: 'half' },
  { value: 0.25, label: 'low' },
  { value: 0, label: 'out' },
] as const

export type StockStatus = 'out' | 'low' | 'ok' | 'unknown'

export interface ItemStock {
  stock: number | null
  status: StockStatus
  lastEventAt: string | null
  lastBoughtAt: string | null
  touches: number
}

const DELTA: Partial<Record<StockEventType, 1 | -1>> = {
  bought: 1,
  produced: 1,
  used: -1,
  wasted: -1,
}

export function deriveStock(events: StockEvent[]): number | null {
  const live = events.filter((e) => !e.deleted).sort((a, b) => a.at.localeCompare(b.at))
  let stock: number | null = null
  for (const e of live) {
    switch (e.type) {
      case 'count':
        stock = e.quantity
        break
      case 'finished':
        stock = 0
        break
      case 'adjust':
        stock = (stock ?? 0) + e.quantity
        break
      default: {
        const sign = DELTA[e.type]
        if (sign) stock = (stock ?? 0) + sign * e.quantity
      }
    }
  }
  return stock === null ? null : Math.max(0, round(stock))
}

export function statusFor(item: Item, stock: number | null): StockStatus {
  if (item.tracking_mode === 'cycle') return 'unknown'
  if (stock === null) return 'unknown'
  if (stock <= 0) return 'out'
  if (item.tracking_mode === 'level') return stock <= 0.25 ? 'low' : 'ok'
  if (item.par_level !== null && stock < item.par_level) return 'low'
  return 'ok'
}

export function summarise(item: Item, events: StockEvent[]): ItemStock {
  const live = events.filter((e) => !e.deleted)
  const stock = deriveStock(live)
  const sorted = [...live].sort((a, b) => b.at.localeCompare(a.at))
  const bought = sorted.find((e) => e.type === 'bought' || e.type === 'produced')
  return {
    stock,
    status: statusFor(item, stock),
    lastEventAt: sorted[0]?.at ?? null,
    lastBoughtAt: bought?.at ?? null,
    touches: live.length,
  }
}

export function levelLabel(stock: number | null): string {
  if (stock === null) return 'unknown'
  const hit = [...LEVELS].sort((a, b) => Math.abs(a.value - stock) - Math.abs(b.value - stock))[0]
  return hit.label
}

export function formatStock(item: Item, stock: number | null): string {
  if (item.tracking_mode === 'cycle') return 'cycle'
  if (stock === null) return '—'
  if (item.tracking_mode === 'level') return levelLabel(stock)
  return `${trim(stock)} ${item.unit}${stock === 1 ? '' : 's'}`
}

// Quantity to buy to get back to par, in whole packs.
export function suggestedQuantity(item: Item, stock: number | null): number {
  const pack = item.pack_size > 0 ? item.pack_size : 1
  if (item.tracking_mode === 'level') return 1
  const par = item.par_level ?? pack
  const gap = Math.max(par - (stock ?? 0), pack)
  return Math.max(1, Math.ceil(gap / pack))
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}
