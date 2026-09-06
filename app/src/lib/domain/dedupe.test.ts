import { describe, expect, it } from 'vitest'
import { planDedupe, repointEvents, repointSlots } from './dedupe'
import type { Item, MealSlot, StockEvent } from '../db/types'

const item = (id: string, name: string, updated_at: string): Item => ({
  id, household_id: 'h', updated_at, deleted: false, name, aliases: [], category: 'pantry', location: 'pantry', unit: 'tin', pack_size: 1,
  par_level: null, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false, source: 'bought', perishable_days: null,
  snackbox_ok: false, snack_component: null, kid_ok: true, archived: false,
})
const ev = (id: string, item_id: string): StockEvent => ({ id, household_id: 'h', updated_at: '', deleted: false, item_id, type: 'used', quantity: 1, at: '2026-09-01T00:00:00Z', by_member: null, source: 'tap', note: null, price_zar: null, capture_id: null })

describe('planDedupe', () => {
  it('keeps the copy with history, then the oldest, ignoring case and spaces', () => {
    const items = [item('a', 'Milk', '2026-09-01'), item('b', 'milk ', '2026-09-02'), item('c', 'Eggs', '2026-09-03'), item('d', 'Eggs', '2026-09-01')]
    const plan = planDedupe(items, [ev('e1', 'b')])
    expect(plan.keepers.get('a')).toBe('b')
    expect(plan.keepers.get('c')).toBe('d')
    expect(plan.remove.map((i) => i.id).sort()).toEqual(['a', 'c'])
  })
  it('repoints events and slot item lists without duplicates', () => {
    const keepers = new Map([['a', 'b']])
    expect(repointEvents([ev('e1', 'a'), ev('e2', 'b')], keepers).map((e) => [e.id, e.item_id])).toEqual([['e1', 'b']])
    const slot: MealSlot = { id: 's', household_id: 'h', updated_at: '', deleted: false, date: '2026-09-01', slot: 'school_snackbox', recipe_id: null, free_text: null, servings: null, for_members: [], item_ids: ['a', 'b', 'c'], item_verdicts: {}, status: 'planned', notes: null }
    expect(repointSlots([slot], keepers)[0].item_ids).toEqual(['b', 'c'])
  })
})
