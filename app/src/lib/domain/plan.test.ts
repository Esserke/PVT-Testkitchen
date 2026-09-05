import { describe, expect, it } from 'vitest'
import { convert, weekStart, weekDays, isSchoolDay, recipeNeeds, planLines, fillSnackBoxes, snackPools, suggestDinners, cookedDeductions } from './plan'
import type { Item, MealSlot, Recipe, RecipeIngredient } from '../db/types'
import type { ItemStock } from './stock'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, household_id: 'h', updated_at: '', deleted: false, name: id, aliases: [], category: 'pantry', location: 'pantry',
  unit: 'kg', pack_size: 1, par_level: null, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null,
  bulk_ok: false, source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false, ...over,
})
const recipe = (id: string, servings = 4): Recipe => ({
  id, household_id: 'h', updated_at: '', deleted: false, title: id, servings, prep_minutes: null, cook_minutes: null,
  steps: null, source_url: null, photo_path: null, tags: [], rating: {}, daughter_verdict: null,
})
const ing = (recipe_id: string, item_id: string | null, quantity: number | null, unit: string | null, optional = false): RecipeIngredient => ({
  id: `${recipe_id}-${item_id}`, household_id: 'h', updated_at: '', deleted: false, recipe_id, item_id, free_text: null, quantity, unit, optional,
})
const st = (stock: number | null, status: ItemStock['status'] = 'ok'): ItemStock => ({ stock, status, lastEventAt: null, lastBoughtAt: null, touches: 0 })

describe('dates', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-09-05')).toBe('2026-08-31')
    expect(weekDays('2026-08-31')[6]).toBe('2026-09-06')
  })
  it('school is weekdays only', () => {
    expect(isSchoolDay('2026-09-04')).toBe(true)
    expect(isSchoolDay('2026-09-05')).toBe(false)
  })
})

describe('convert', () => {
  it('handles mass, volume and plurals', () => {
    expect(convert(500, 'g', 'kg')).toBe(0.5)
    expect(convert(2, 'litre', 'ml')).toBe(2000)
    expect(convert(3, 'tin', 'tins')).toBe(3)
    expect(convert(1, 'cup', 'kg')).toBeNull()
  })
})

describe('recipeNeeds', () => {
  const items = new Map([['mince', item('mince')], ['tomato', item('tomato', { unit: 'tin' })], ['pasta', item('pasta', { unit: 'kg', pack_size: 0.5 })]])
  it('scales by servings and converts units', () => {
    const r = recipe('bol', 4)
    const needs = recipeNeeds(r, [ing('bol', 'mince', 500, 'g'), ing('bol', 'tomato', 1, 'tin'), ing('bol', 'pasta', null, 'some')], items, 6)
    expect(needs.get('mince')).toBeCloseTo(0.75)
    expect(needs.get('tomato')).toBe(1.5)
    expect(needs.get('pasta')).toBe(0.5)
  })
  it('skips optional and free-text ingredients', () => {
    const needs = recipeNeeds(recipe('x'), [ing('x', 'mince', 1, 'kg', true), ing('x', null, 1, 'kg')], items, null)
    expect(needs.size).toBe(0)
  })
})

describe('planLines', () => {
  it('buys the shortfall in whole packs', () => {
    const items = new Map([['tomato', item('tomato', { unit: 'tin', pack_size: 1 })], ['milk', item('milk', { unit: 'litre', pack_size: 6 })]])
    const lines = planLines(new Map([['tomato', 3], ['milk', 7]]), items, new Map([['tomato', st(1)], ['milk', st(null)]]))
    expect(lines.map((l) => [l.item.id, l.quantity])).toEqual([['tomato', 2], ['milk', 2]])
  })
  it('skips what is already in stock', () => {
    const items = new Map([['tomato', item('tomato', { unit: 'tin' })]])
    expect(planLines(new Map([['tomato', 2]]), items, new Map([['tomato', st(4)]]))).toEqual([])
  })
})

describe('snack boxes', () => {
  const items = [
    item('apple', { snackbox_ok: true, snack_component: 'fruit' }), item('banana', { snackbox_ok: true, snack_component: 'fruit' }),
    item('cheese', { snackbox_ok: true, snack_component: 'protein' }), item('crackers', { snackbox_ok: true, snack_component: 'carb' }),
    item('bread', { snackbox_ok: true, snack_component: 'carb' }),
  ]
  it('fills school days without repeating within the week where possible', () => {
    const boxes = fillSnackBoxes(weekDays('2026-08-31'), snackPools(items), new Map(), new Map())
    expect(boxes.size).toBe(5)
    const mon = boxes.get('2026-08-31')!
    const tue = boxes.get('2026-09-01')!
    expect(mon).toHaveLength(3)
    expect(mon.find((id) => id.startsWith('a') || id.startsWith('b'))).not.toBe(tue.find((id) => id.startsWith('a') || id.startsWith('b')))
    expect(boxes.has('2026-09-05')).toBe(false)
  })
  it('keeps boxes that already exist and skips items that are out', () => {
    const existing = new Map([['2026-08-31', ['apple']]])
    const boxes = fillSnackBoxes(weekDays('2026-08-31'), snackPools(items), existing, new Map(), new Map([['cheese', st(0, 'out')]]))
    expect(boxes.get('2026-08-31')).toEqual(['apple'])
    expect(boxes.get('2026-09-01')).not.toContain('cheese')
  })
})

describe('suggestDinners and cooking', () => {
  it('prefers least recently cooked, then rating', () => {
    const rs = [recipe('a'), { ...recipe('b'), rating: { household: 5 } }, recipe('c')]
    const picks = suggestDinners(rs, new Map([['a', '2026-09-01']]), 2, new Set())
    expect(picks.map((r) => r.id)).toEqual(['b', 'c'])
  })
  it('deducts only count-tracked items', () => {
    const items = new Map([['mince', item('mince')], ['oil', item('oil', { tracking_mode: 'level' })]])
    const slot: MealSlot = { id: 's', household_id: 'h', updated_at: '', deleted: false, date: '2026-09-01', slot: 'dinner', recipe_id: 'r', free_text: null, servings: 4, for_members: [], item_ids: [], status: 'planned', notes: null }
    const d = cookedDeductions(slot, recipe('r'), [ing('r', 'mince', 500, 'g'), ing('r', 'oil', 2, 'tbsp')], items)
    expect(d).toEqual([{ item: items.get('mince'), quantity: 0.5 }])
  })
})
