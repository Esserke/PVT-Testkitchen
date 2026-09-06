import { describe, expect, it } from 'vitest'
import { consumptionSeries, consumptionRate, purchaseIntervals, forecast, rateChange, predictedNeeds, stockHistory } from './forecast'
import type { Item, StockEvent } from '../db/types'

const item = (over: Partial<Item> = {}): Item => ({
  id: 'i', household_id: 'h', updated_at: '', deleted: false, name: 'Milk', aliases: [], category: 'dairy', location: 'fridge',
  unit: 'litre', pack_size: 6, par_level: 6, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false,
  source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false, ...over,
})
let n = 0
const ev = (type: StockEvent['type'], quantity: number, day: string): StockEvent => ({
  id: `e${n++}`, household_id: 'h', updated_at: '', deleted: false, item_id: 'i', type, quantity, at: `${day}T08:00:00.000Z`,
  by_member: null, source: 'tap', note: null, price_zar: null, capture_id: null,
})
const TODAY = '2026-09-28'

describe('consumptionSeries', () => {
  it('counts drops from use, waste, finished and lower counts, not purchases', () => {
    const s = consumptionSeries([ev('count', 6, '2026-09-01'), ev('used', 1, '2026-09-02'), ev('bought', 6, '2026-09-03'), ev('count', 8, '2026-09-04'), ev('finished', 0, '2026-09-10')])
    expect(s.map((p) => p.qty)).toEqual([1, 3, 8])
  })
})

describe('consumptionRate and forecast', () => {
  it('estimates units per day and days left', () => {
    const events = [ev('count', 12, '2026-09-01'), ev('used', 2, '2026-09-07'), ev('used', 2, '2026-09-14'), ev('used', 2, '2026-09-21')]
    const r = consumptionRate(events, TODAY)!
    expect(r.points).toBe(3)
    expect(r.ratePerDay).toBeCloseTo(6 / 27, 3)
    const f = forecast(item(), events, TODAY)
    expect(f.method).toBe('rate')
    expect(f.daysLeft).toBe(Math.floor(6 / (6 / 27)))
    expect(f.confidence).toBe('medium')
  })
  it('is out when stock is zero', () => {
    const f = forecast(item(), [ev('finished', 0, '2026-09-20')], TODAY)
    expect(f.daysLeft).toBe(0)
    expect(f.runoutDate).toBe(TODAY)
  })
  it('uses purchase intervals for cycle items', () => {
    const events = [ev('bought', 5, '2026-06-01'), ev('bought', 5, '2026-07-01'), ev('bought', 5, '2026-08-01'), ev('bought', 5, '2026-09-01')]
    const f = forecast(item({ tracking_mode: 'cycle' }), events, TODAY)
    expect(f.method).toBe('interval')
    expect(f.medianIntervalDays).toBe(31)
    expect(f.runoutDate).toBe('2026-10-02')
    expect(f.daysLeft).toBe(4)
    expect(f.confidence).toBe('medium')
  })
  it('falls back to intervals when consumption is not logged', () => {
    const events = [ev('bought', 6, '2026-08-01'), ev('bought', 6, '2026-08-15'), ev('bought', 6, '2026-08-29')]
    const f = forecast(item(), events, TODAY)
    expect(f.method).toBe('interval')
    expect(f.daysLeft).toBeLessThan(0)
  })
  it('has nothing to say without history', () => expect(forecast(item(), [], TODAY).method).toBe('none'))
})

describe('purchaseIntervals', () => {
  it('collapses same-day purchases and ignores deleted', () => {
    const r = purchaseIntervals([ev('bought', 1, '2026-09-01'), ev('bought', 1, '2026-09-01'), { ...ev('bought', 1, '2026-09-05'), deleted: true }, ev('bought', 1, '2026-09-11')])
    expect(r.intervals).toEqual([10])
    expect(r.lastBought).toBe('2026-09-11')
  })
})

describe('rateChange', () => {
  it('reports the fraction change between windows', () => {
    const events = [ev('count', 40, '2026-07-30')]
    for (const d of ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24']) events.push(ev('used', 2, d))
    for (const d of ['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24']) events.push(ev('used', 3, d))
    expect(rateChange(events, TODAY)).toBeCloseTo(0.5)
  })
  it('needs enough points on both sides', () => expect(rateChange([ev('count', 5, '2026-09-01'), ev('used', 1, '2026-09-02')], TODAY)).toBeNull())
})

describe('predictedNeeds and stockHistory', () => {
  it('picks items that run out before the horizon', () => {
    const a = item({ id: 'a' })
    const b = item({ id: 'b' })
    const fc = new Map([
      ['a', { method: 'rate' as const, ratePerDay: 1, medianIntervalDays: null, daysLeft: 3, runoutDate: '2026-10-01', confidence: 'medium' as const, points: 3 }],
      ['b', { method: 'rate' as const, ratePerDay: 1, medianIntervalDays: null, daysLeft: 30, runoutDate: '2026-10-28', confidence: 'medium' as const, points: 3 }],
    ])
    expect(predictedNeeds([a, b], fc, '2026-10-05').map((n) => n.item.id)).toEqual(['a'])
  })
  it('samples derived stock per day', () => {
    const h = stockHistory([ev('count', 4, '2026-09-26'), ev('used', 1, '2026-09-27')], TODAY, 4)
    expect(h.map((p) => p.stock)).toEqual([null, 4, 3, 3])
  })
})
