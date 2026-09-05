// Forecasting from the ledger: how fast things go, when they run out, and how
// the rhythm of purchases looks for cycle items. All pure; dates are ISO strings.
import type { Item, StockEvent } from '../db/types'
import { deriveStock } from './stock'
import { addDays, toIsoDate } from './plan'

export type Confidence = 'none' | 'low' | 'medium' | 'high'
export type Method = 'rate' | 'interval' | 'none'

export interface Forecast {
  method: Method
  ratePerDay: number | null // item units consumed per day (rate method)
  medianIntervalDays: number | null // days between purchases (interval method)
  daysLeft: number | null // negative means overdue / already out
  runoutDate: string | null
  confidence: Confidence
  points: number // consumption events or purchase intervals the estimate rests on
}

const DAY = 86_400_000
const dayOf = (iso: string) => iso.slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((new Date(dayOf(b)).getTime() - new Date(dayOf(a)).getTime()) / DAY)

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Every drop in derived stock is consumption: used, wasted, finished, and a count
// lower than the running total. Increases are not.
export function consumptionSeries(events: StockEvent[]): { at: string; qty: number }[] {
  const live = events.filter((e) => !e.deleted).sort((a, b) => a.at.localeCompare(b.at))
  const out: { at: string; qty: number }[] = []
  let stock: number | null = null
  for (const e of live) {
    const before = stock
    stock = deriveStock(live.slice(0, live.indexOf(e) + 1))
    if (before === null || stock === null) continue
    if (e.type === 'bought' || e.type === 'produced' || e.type === 'adjust') continue
    const drop = before - stock
    if (drop > 0) out.push({ at: e.at, qty: drop })
  }
  return out
}

// Units per day over a trailing window. Falls back to wider windows when the data is thin.
export function consumptionRate(events: StockEvent[], today: string, windows = [28, 56, 84]): { ratePerDay: number; points: number; windowDays: number } | null {
  const series = consumptionSeries(events)
  if (!series.length) return null
  for (const w of windows) {
    const start = addDays(today, -w)
    const inWindow = series.filter((p) => dayOf(p.at) >= start)
    if (inWindow.length >= 2 || (w === windows[windows.length - 1] && inWindow.length >= 1)) {
      const firstEvent = events.filter((e) => !e.deleted).map((e) => dayOf(e.at)).sort()[0]
      const observed = Math.max(1, Math.min(w, daysBetween(firstEvent, today)))
      const total = inWindow.reduce((s, p) => s + p.qty, 0)
      return { ratePerDay: total / observed, points: inWindow.length, windowDays: w }
    }
  }
  return null
}

export function purchaseIntervals(events: StockEvent[]): { intervals: number[]; lastBought: string | null } {
  const buys = [...new Set(events.filter((e) => !e.deleted && (e.type === 'bought' || e.type === 'produced')).map((e) => dayOf(e.at)))].sort()
  const intervals: number[] = []
  for (let i = 1; i < buys.length; i++) intervals.push(daysBetween(buys[i - 1], buys[i]))
  return { intervals: intervals.filter((d) => d > 0), lastBought: buys.at(-1) ?? null }
}

function confidenceFor(points: number): Confidence {
  if (points >= 5) return 'high'
  if (points >= 3) return 'medium'
  if (points >= 1) return 'low'
  return 'none'
}

const NONE: Forecast = { method: 'none', ratePerDay: null, medianIntervalDays: null, daysLeft: null, runoutDate: null, confidence: 'none', points: 0 }

export function forecast(item: Item, events: StockEvent[], today: string): Forecast {
  const live = events.filter((e) => !e.deleted)
  if (!live.length) return NONE
  const stock = deriveStock(live)

  if (item.tracking_mode !== 'cycle' && stock !== null) {
    if (stock <= 0) return { ...NONE, method: 'rate', daysLeft: 0, runoutDate: today, confidence: 'high', points: 1 }
    const r = consumptionRate(live, today)
    if (r && r.ratePerDay > 0) {
      const daysLeft = Math.floor(stock / r.ratePerDay)
      return { method: 'rate', ratePerDay: r.ratePerDay, medianIntervalDays: null, daysLeft, runoutDate: addDays(today, daysLeft), confidence: confidenceFor(r.points), points: r.points }
    }
  }

  const { intervals, lastBought } = purchaseIntervals(live)
  const med = median(intervals)
  if (med && lastBought) {
    const due = addDays(lastBought, Math.round(med))
    const daysLeft = daysBetween(today, due)
    return { method: 'interval', ratePerDay: null, medianIntervalDays: med, daysLeft, runoutDate: due, confidence: confidenceFor(intervals.length), points: intervals.length }
  }
  return NONE
}

// Compare the last window with the one before it. Returns a fraction (0.3 = up 30%) or null.
export function rateChange(events: StockEvent[], today: string, windowDays = 28, minPoints = 3): number | null {
  const series = consumptionSeries(events)
  const mid = addDays(today, -windowDays)
  const start = addDays(today, -2 * windowDays)
  const recent = series.filter((p) => dayOf(p.at) >= mid)
  const before = series.filter((p) => dayOf(p.at) >= start && dayOf(p.at) < mid)
  if (recent.length < minPoints || before.length < minPoints) return null
  const a = recent.reduce((s, p) => s + p.qty, 0)
  const b = before.reduce((s, p) => s + p.qty, 0)
  if (b === 0) return null
  return (a - b) / b
}

// Items whose forecast says they run out on or before the horizon, in packs to buy.
export function predictedNeeds(items: Item[], forecasts: Map<string, Forecast>, horizon: string): { item: Item; quantity: number }[] {
  const out: { item: Item; quantity: number }[] = []
  for (const item of items) {
    if (item.deleted || item.archived) continue
    const f = forecasts.get(item.id)
    if (!f || !f.runoutDate || f.confidence === 'none') continue
    if (f.runoutDate > horizon) continue
    out.push({ item, quantity: 1 })
  }
  return out
}

// Derived stock sampled daily for a sparkline.
export function stockHistory(events: StockEvent[], today: string, days = 56): { date: string; stock: number | null }[] {
  const live = events.filter((e) => !e.deleted).sort((a, b) => a.at.localeCompare(b.at))
  const out: { date: string; stock: number | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    out.push({ date: d, stock: deriveStock(live.filter((e) => dayOf(e.at) <= d)) })
  }
  return out
}

export function describe(f: Forecast, item: Item): string {
  if (f.method === 'none') return item.tracking_mode === 'cycle' ? 'no purchases logged yet' : 'not enough history'
  if (f.daysLeft === null) return ''
  if (f.method === 'interval') {
    if (f.daysLeft < 0) return `${-f.daysLeft} day${f.daysLeft === -1 ? '' : 's'} overdue`
    if (f.daysLeft === 0) return 'due today'
    return `due in ${f.daysLeft} day${f.daysLeft === 1 ? '' : 's'}`
  }
  if (f.daysLeft <= 0) return 'out'
  return `about ${f.daysLeft} day${f.daysLeft === 1 ? '' : 's'} left`
}

export const todayIso = () => toIsoDate(new Date())
