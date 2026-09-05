import { describe, expect, it } from 'vitest'
import { deriveStock, statusFor, suggestedQuantity, summarise } from './stock'
import type { Item, StockEvent } from '../db/types'

const item = (over: Partial<Item> = {}): Item => ({
  id: 'i1', household_id: 'h', updated_at: '', deleted: false,
  name: 'Milk', aliases: [], category: 'dairy', location: 'fridge', unit: 'litre', pack_size: 6,
  par_level: 6, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false,
  source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false, ...over,
})
let n = 0
const ev = (type: StockEvent['type'], quantity: number, at?: string): StockEvent => ({
  id: `e${n++}`, household_id: 'h', updated_at: '', deleted: false, item_id: 'i1', type, quantity,
  at: at ?? new Date(2026, 0, 1, 0, n).toISOString(), by_member: null, source: 'tap', note: null, price_zar: null, capture_id: null,
})

describe('deriveStock', () => {
  it('is unknown with no events', () => expect(deriveStock([])).toBeNull())
  it('adds purchases and subtracts use', () => {
    expect(deriveStock([ev('bought', 6), ev('used', 2), ev('wasted', 1)])).toBe(3)
  })
  it('count resets the running total', () => {
    expect(deriveStock([ev('bought', 6), ev('count', 2), ev('bought', 6)])).toBe(8)
  })
  it('finished sets zero regardless of history', () => {
    expect(deriveStock([ev('bought', 6), ev('finished', 0)])).toBe(0)
  })
  it('ignores deleted events and orders by time', () => {
    const late = ev('bought', 6, '2026-02-01T00:00:00Z')
    const early = ev('count', 1, '2026-01-01T00:00:00Z')
    const gone = { ...ev('bought', 100), deleted: true }
    expect(deriveStock([late, gone, early])).toBe(7)
  })
  it('never goes below zero', () => expect(deriveStock([ev('used', 3)])).toBe(0))
})

describe('statusFor', () => {
  it('flags below par as low and zero as out', () => {
    expect(statusFor(item(), 5)).toBe('low')
    expect(statusFor(item(), 6)).toBe('ok')
    expect(statusFor(item(), 0)).toBe('out')
    expect(statusFor(item(), null)).toBe('unknown')
  })
  it('treats level items by fraction', () => {
    const lvl = item({ tracking_mode: 'level' })
    expect(statusFor(lvl, 1)).toBe('ok')
    expect(statusFor(lvl, 0.25)).toBe('low')
    expect(statusFor(lvl, 0)).toBe('out')
  })
  it('cycle items are unknown until Phase 4', () => expect(statusFor(item({ tracking_mode: 'cycle' }), 3)).toBe('unknown'))
})

describe('suggestedQuantity', () => {
  it('buys whole packs back to par', () => {
    expect(suggestedQuantity(item({ pack_size: 6, par_level: 6 }), 2)).toBe(1)
    expect(suggestedQuantity(item({ pack_size: 1, par_level: 4 }), 1)).toBe(3)
    expect(suggestedQuantity(item({ pack_size: 9, par_level: 12 }), 0)).toBe(2)
  })
  it('always at least one', () => expect(suggestedQuantity(item(), null)).toBe(1))
})

describe('summarise', () => {
  it('reports last bought and touches', () => {
    const s = summarise(item(), [ev('bought', 6, '2026-01-02T00:00:00Z'), ev('used', 1, '2026-01-03T00:00:00Z')])
    expect(s.stock).toBe(5)
    expect(s.lastBoughtAt).toBe('2026-01-02T00:00:00Z')
    expect(s.touches).toBe(2)
    expect(s.status).toBe('low')
  })
})
