import { describe, expect, it } from 'vitest'
import { budgetStatus, slipRecords } from './budget'
import { dailyIntake, weekSummary } from './childIntake'
import type { Budget, Capture, ChildMeal, Item, StockEvent } from '../db/types'

const item = (id: string, category: string): Item => ({ id, household_id: 'h', updated_at: '', deleted: false, name: id, aliases: [], category, location: 'pantry', unit: 'piece', pack_size: 1, par_level: null, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false, source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false })
const ev = (item_id: string, price: number, day: string): StockEvent => ({ id: `${item_id}${day}`, household_id: 'h', updated_at: '', deleted: false, item_id, type: 'bought', quantity: 1, at: `${day}T08:00:00.000Z`, by_member: null, source: 'shopping', note: 'Spar', price_zar: price, capture_id: null })
const budget = (category: string, monthly_zar: number): Budget => ({ id: category, household_id: 'h', updated_at: '', deleted: false, category, monthly_zar })

describe('budgetStatus', () => {
  it('compares month spend to budget and projects to month end', () => {
    const items = new Map([['milk', item('milk', 'dairy')], ['soap', item('soap', 'cleaning & laundry')]])
    const events = [ev('milk', 300, '2026-09-03'), ev('soap', 100, '2026-09-05')]
    const r = budgetStatus([budget('all', 4000), budget('dairy', 600)], events, items, '2026-09-10')
    expect(r.total!.spent).toBe(400)
    expect(r.total!.projected).toBe(1200)
    expect(r.lines[0].category).toBe('dairy')
    expect(r.lines[0].share).toBe(0.5)
  })
})

describe('slipRecords', () => {
  it('reads shop, date and total from confirmed receipt captures', () => {
    const c: Capture = { id: 'c1', household_id: 'h', updated_at: '', deleted: false, kind: 'receipt', raw_text: 'Checkers · 2026-09-04 · 12 lines', photo_path: null, location: null, proposed: { shop: 'Checkers', date: '2026-09-04', total: 1234.5 }, status: 'confirmed', created_at: '2026-09-04T12:00:00.000Z', by_member: null }
    expect(slipRecords([c], '2026-09-10')).toEqual([{ id: 'c1', shop: 'Checkers', date: '2026-09-04', total: 1234.5, lines: 12 }])
  })
})

describe('child intake', () => {
  it('summarises a week of meals', () => {
    const meal = (date: string, eaten: ChildMeal['eaten'], fruit_veg: number, protein: boolean): ChildMeal => ({ id: `${date}${fruit_veg}`, household_id: 'h', updated_at: '', deleted: false, date, slot: 'lunch', description: null, item_ids: [], eaten, fruit_veg, protein, notes: null, at: '' })
    const days = dailyIntake([meal('2026-09-05', 'all', 2, true), meal('2026-09-05', 'some', 1, false), meal('2026-09-06', 'none', 0, true)], '2026-09-06', 7)
    const s = weekSummary(days)
    expect(s.mealsLogged).toBe(3)
    expect(s.proteinDays).toBe(2)
    expect(days[5].eaten).toBe(0.75)
    expect(days[6].eaten).toBe(0)
    expect(s.avgFruitVeg).toBe(1.5)
  })
})
