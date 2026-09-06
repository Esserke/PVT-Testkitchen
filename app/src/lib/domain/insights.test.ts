import { describe, expect, it } from 'vitest'
import { spendByMonth, priceHistory, recipeRotation, snackVariety, waste } from './insights'
import type { Item, MealSlot, Recipe, StockEvent } from '../db/types'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, household_id: 'h', updated_at: '', deleted: false, name: id, aliases: [], category: 'dairy', location: 'fridge', unit: 'litre',
  pack_size: 6, par_level: null, tracking_mode: 'count', preferred_shop: 'Spar', typical_price_zar: null, bulk_ok: false, source: 'bought',
  perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false, ...over,
})
let n = 0
const ev = (item_id: string, type: StockEvent['type'], quantity: number, day: string, price: number | null = null, note: string | null = null): StockEvent => ({
  id: `e${n++}`, household_id: 'h', updated_at: '', deleted: false, item_id, type, quantity, at: `${day}T08:00:00.000Z`, by_member: null, source: 'shopping', note, price_zar: price, capture_id: null,
})
const recipe = (id: string, rating = 0): Recipe => ({ id, household_id: 'h', updated_at: '', deleted: false, title: id, servings: 3, prep_minutes: null, cook_minutes: null, steps: null, source_url: null, photo_path: null, tags: [], rating: rating ? { household: rating } : {}, daughter_verdict: null })
const slot = (date: string, over: Partial<MealSlot>): MealSlot => ({ id: `s${n++}`, household_id: 'h', updated_at: '', deleted: false, date, slot: 'dinner', recipe_id: null, free_text: null, servings: 3, for_members: [], item_ids: [], item_verdicts: {}, status: 'planned', notes: null, ...over })
const TODAY = '2026-09-28'

describe('spend', () => {
  it('groups priced purchases by month, category and shop', () => {
    const items = new Map([['milk', item('milk')], ['soap', item('soap', { category: 'cleaning & laundry' })]])
    const s = spendByMonth([ev('milk', 'bought', 6, '2026-09-02', 120, 'Checkers'), ev('soap', 'bought', 1, '2026-09-10', 40), ev('milk', 'bought', 6, '2026-08-20', 110), ev('milk', 'bought', 6, '2026-09-11')], items, TODAY, 2)
    expect(s[0].month).toBe('2026-09')
    expect(s[0].total).toBe(160)
    expect(s[0].byCategory).toEqual([['dairy', 120], ['cleaning & laundry', 40]])
    expect(s[0].byShop).toEqual([['Checkers', 120], ['Spar', 40]])
    expect(s[1].total).toBe(110)
  })
  it('price history is per unit, newest first', () => {
    const p = priceHistory([ev('milk', 'bought', 6, '2026-09-02', 120), ev('milk', 'bought', 6, '2026-09-20', 132)])
    expect(p[0].perUnit).toBe(22)
    expect(p[1].perUnit).toBe(20)
  })
})

describe('recipes and snack boxes', () => {
  it('finds ruts and forgotten favourites', () => {
    const rs = [recipe('pasta'), recipe('bobotie', 5), recipe('soup', 4)]
    const slots = [
      ...['2026-09-05', '2026-09-12', '2026-09-19'].map((d) => slot(d, { recipe_id: 'pasta', status: 'cooked' })),
      slot('2026-06-01', { recipe_id: 'bobotie', status: 'cooked' }),
      slot('2026-09-20', { recipe_id: 'soup', status: 'cooked' }),
    ]
    const r = recipeRotation(rs, slots, TODAY)
    expect(r.rut.map((x) => x.recipe.id)).toEqual(['pasta'])
    expect(r.forgotten.map((x) => x.recipe.id)).toEqual(['bobotie'])
  })
  it('scores snack box variety per week', () => {
    const slots = [
      slot('2026-09-21', { slot: 'school_snackbox', item_ids: ['a', 'b'] }),
      slot('2026-09-22', { slot: 'school_snackbox', item_ids: ['a', 'c'] }),
    ]
    const v = snackVariety(slots, TODAY, 2)
    expect(v).toEqual([{ week: '2026-09-21', unique: 3, total: 4, score: 0.75 }])
  })
})

describe('waste', () => {
  it('sums thrown-out quantities and guesses cost from the last price', () => {
    const items = new Map([['milk', item('milk')]])
    const w = waste([ev('milk', 'bought', 6, '2026-09-02', 120), ev('milk', 'wasted', 1, '2026-09-10'), ev('milk', 'wasted', 2, '2026-09-12')], items, TODAY)
    expect(w.lines[0].quantity).toBe(3)
    expect(w.lines[0].cost).toBe(60)
    expect(w.total).toBe(60)
  })
})
