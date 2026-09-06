import { describe, expect, it } from 'vitest'
import { verdictStats, loves, notKeen, untried } from './faye'
import type { Item, MealSlot } from '../db/types'

const item = (id: string): Item => ({ id, household_id: 'h', updated_at: '', deleted: false, name: id, aliases: [], category: 'fresh', location: 'fridge', unit: 'piece', pack_size: 1, par_level: null, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false, source: 'bought', perishable_days: null, snackbox_ok: true, snack_component: 'fruit', kid_ok: true, archived: false })
const box = (date: string, item_ids: string[], item_verdicts: MealSlot['item_verdicts']): MealSlot => ({ id: date, household_id: 'h', updated_at: '', deleted: false, date, slot: 'school_snackbox', recipe_id: null, free_text: null, servings: null, for_members: [], item_ids, item_verdicts, status: 'cooked', notes: null })

describe('verdicts', () => {
  const slots = [
    box('2026-09-01', ['apple', 'cuke', 'cheese'], { apple: 'ate', cuke: 'left', cheese: 'ate' }),
    box('2026-09-02', ['apple', 'cuke'], { apple: 'ate', cuke: 'left' }),
    box('2026-09-03', ['grapes'], {}),
  ]
  const items = [item('apple'), item('cuke'), item('cheese'), item('grapes'), item('rusk')]
  it('scores what she eats and what comes back', () => {
    const st = verdictStats(slots)
    expect(st.get('apple')!.score).toBeCloseTo((2 + 0.6) / 3)
    expect(st.get('cuke')!.score).toBeCloseTo(0.6 / 3)
    expect(st.get('grapes')!.score).toBe(0.6)
    expect(st.get('cuke')!.lastVerdict).toBe('left')
  })
  it('lists loves, not keen and untried', () => {
    const st = verdictStats(slots)
    expect(loves(items, st).map((x) => x.item.id)).toEqual(['apple'])
    expect(notKeen(items, st).map((x) => x.item.id)).toEqual(['cuke'])
    expect(untried(items, st).map((i) => i.id)).toEqual(['rusk'])
  })
})
