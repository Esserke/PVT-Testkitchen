import { describe, expect, it } from 'vitest'
import { belowParItems, reconcile } from './list'
import type { Item, ListLine } from '../db/types'
import type { ItemStock } from './stock'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, household_id: 'h', updated_at: '', deleted: false, name: id, aliases: [], category: 'pantry', location: 'pantry',
  unit: 'tin', pack_size: 1, par_level: 3, tracking_mode: 'count', preferred_shop: 'Spar', typical_price_zar: null,
  bulk_ok: false, source: 'bought', perishable_days: null, snackbox_ok: false, kid_ok: true, archived: false, ...over,
})
const st = (stock: number | null, status: ItemStock['status']): ItemStock => ({ stock, status, lastEventAt: null, lastBoughtAt: null, touches: 0 })
const line = (id: string, item_id: string, reason: ListLine['reason'], checked = false): ListLine => ({
  id, household_id: 'h', updated_at: '', deleted: false, trip_id: 't', item_id, free_text: null, quantity: 1, reason,
  shop: null, checked, price_paid_zar: null, event_id: null,
})

describe('belowParItems', () => {
  it('picks low and out items, skipping cycle and unknown', () => {
    const items = [item('a'), item('b'), item('c', { tracking_mode: 'cycle' }), item('d')]
    const stock = new Map([['a', st(1, 'low')], ['b', st(5, 'ok')], ['c', st(0, 'unknown')], ['d', st(0, 'out')]])
    expect(belowParItems(items, stock).map((n) => [n.item.id, n.quantity])).toEqual([['a', 2], ['d', 3]])
  })
})

describe('reconcile', () => {
  it('adds missing needs and removes stale automatic lines only', () => {
    const lines = [line('l1', 'a', 'below_par'), line('l2', 'b', 'below_par'), line('l3', 'c', 'manual'), line('l4', 'd', 'below_par', true)]
    const diff = reconcile(lines, [{ item: item('a'), quantity: 1 }, { item: item('e'), quantity: 2 }])
    expect(diff.add.map((n) => n.item.id)).toEqual(['e'])
    expect(diff.remove.map((l) => l.id)).toEqual(['l2'])
  })
})
