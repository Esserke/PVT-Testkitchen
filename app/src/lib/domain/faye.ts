// What the child actually eats. Verdicts come from the snack box sheet: ate / some / left.
import type { Item, MealSlot, Verdict } from '../db/types'

export interface VerdictStats { packed: number; ate: number; some: number; left: number; score: number; last: string | null; lastVerdict: Verdict | null }

// Score is a smoothed "would she eat it" between 0 and 1. Untried items start at 0.6 so they get a turn.
export function verdictStats(slots: MealSlot[]): Map<string, VerdictStats> {
  const m = new Map<string, VerdictStats>()
  const get = (id: string) => m.get(id) ?? { packed: 0, ate: 0, some: 0, left: 0, score: 0.6, last: null, lastVerdict: null }
  for (const s of [...slots].sort((a, b) => a.date.localeCompare(b.date))) {
    if (s.deleted || s.slot !== 'school_snackbox') continue
    for (const id of s.item_ids) {
      const st = get(id)
      st.packed++
      const v = s.item_verdicts?.[id]
      if (v) {
        st[v]++
        st.lastVerdict = v
      }
      st.last = s.date
      m.set(id, st)
    }
  }
  for (const st of m.values()) {
    const n = st.ate + st.some + st.left
    st.score = (st.ate + 0.5 * st.some + 0.6) / (n + 1)
  }
  return m
}

export function loves(items: Item[], stats: Map<string, VerdictStats>): { item: Item; st: VerdictStats }[] {
  return items
    .map((item) => ({ item, st: stats.get(item.id) }))
    .filter((x): x is { item: Item; st: VerdictStats } => !!x.st && x.st.ate + x.st.some + x.st.left >= 2 && x.st.score >= 0.7)
    .sort((a, b) => b.st.score - a.st.score)
}
export function notKeen(items: Item[], stats: Map<string, VerdictStats>): { item: Item; st: VerdictStats }[] {
  return items
    .map((item) => ({ item, st: stats.get(item.id) }))
    .filter((x): x is { item: Item; st: VerdictStats } => !!x.st && x.st.ate + x.st.some + x.st.left >= 2 && x.st.left / (x.st.ate + x.st.some + x.st.left) >= 0.5)
    .sort((a, b) => a.st.score - b.st.score)
}
export function untried(items: Item[], stats: Map<string, VerdictStats>): Item[] {
  return items.filter((i) => !i.deleted && !i.archived && i.snackbox_ok && !stats.has(i.id))
}
