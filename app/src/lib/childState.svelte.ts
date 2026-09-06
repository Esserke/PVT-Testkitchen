// Live view of the child's meals and metrics, and the household budget.
import { liveQuery, type Subscription } from 'dexie'
import { db } from './db/schema'
import type { Budget, ChildMeal, ChildMetric } from './db/types'

export const childState = $state<{ meals: ChildMeal[]; metrics: ChildMetric[]; budgets: Budget[] }>({ meals: [], metrics: [], budgets: [] })

let subs: Subscription[] = []
let current: string | null = null
export function watchChild(householdId: string | null): void {
  if (householdId === current) return
  current = householdId
  for (const s of subs) s.unsubscribe()
  subs = []
  if (!householdId) return
  const live = <T extends { deleted: boolean }>(t: string) => liveQuery(() => db.table(t).where('household_id').equals(householdId).filter((r: T) => !r.deleted).toArray() as Promise<T[]>)
  subs.push(
    live<ChildMeal>('child_meal').subscribe((r) => (childState.meals = r.sort((a, b) => b.at.localeCompare(a.at)))),
    live<ChildMetric>('child_metric').subscribe((r) => (childState.metrics = r.sort((a, b) => b.date.localeCompare(a.date)))),
    live<Budget>('budget').subscribe((r) => (childState.budgets = r)),
  )
}
