// Budget against actual spend, with a straight-line projection to month end.
import type { Budget, Capture, Item, StockEvent } from '../db/types'
import { spendByMonth } from './insights'

export interface BudgetLine { category: string; budget: number; spent: number; projected: number; share: number }

export function daysInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function budgetStatus(budgets: Budget[], events: StockEvent[], itemsById: Map<string, Item>, today: string): { lines: BudgetLine[]; total: BudgetLine | null } {
  const month = spendByMonth(events, itemsById, today, 1)[0]
  const day = Number(today.slice(8, 10))
  const factor = daysInMonth(today) / Math.max(1, day)
  const byCat = new Map(month?.byCategory ?? [])
  const live = budgets.filter((b) => !b.deleted)
  const lines: BudgetLine[] = live
    .filter((b) => b.category !== 'all')
    .map((b) => {
      const spent = byCat.get(b.category) ?? 0
      return { category: b.category, budget: b.monthly_zar, spent, projected: spent * factor, share: b.monthly_zar ? spent / b.monthly_zar : 0 }
    })
    .sort((a, b) => b.share - a.share)
  const all = live.find((b) => b.category === 'all')
  const spentAll = month?.total ?? 0
  const total = all ? { category: 'all', budget: all.monthly_zar, spent: spentAll, projected: spentAll * factor, share: all.monthly_zar ? spentAll / all.monthly_zar : 0 } : null
  return { lines, total }
}

export interface SlipRecord { id: string; shop: string; date: string; total: number | null; lines: number }

// Till slips kept as confirmed receipt captures, newest first.
export function slipRecords(captures: Capture[], today: string, months = 3): SlipRecord[] {
  const d = new Date(today)
  d.setMonth(d.getMonth() - months, 1)
  const since = d.toISOString().slice(0, 10)
  return captures
    .filter((c) => !c.deleted && c.kind === 'receipt' && c.status === 'confirmed' && c.created_at.slice(0, 10) >= since)
    .map((c) => {
      const p = (c.proposed ?? {}) as { shop?: string | null; date?: string | null; total?: number | null }
      const m = /(\d+) lines/.exec(c.raw_text ?? '')
      return { id: c.id, shop: p.shop ?? 'Shop', date: (p.date ?? c.created_at).slice(0, 10), total: p.total ?? null, lines: m ? Number(m[1]) : 0 }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
