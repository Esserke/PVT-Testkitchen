// What the child has been getting and eating, from her own meal record.
import type { ChildMeal } from '../db/types'
import { addDays } from './plan'

export const EATEN_SCORE: Record<string, number> = { all: 1, most: 0.75, some: 0.5, little: 0.25, none: 0 }

export interface DayIntake { date: string; meals: number; fruitVeg: number; protein: number; eaten: number | null }

export function dailyIntake(meals: ChildMeal[], today: string, days = 7): DayIntake[] {
  const out: DayIntake[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const ms = meals.filter((m) => !m.deleted && m.date === date)
    const scored = ms.filter((m) => m.eaten)
    out.push({
      date,
      meals: ms.length,
      fruitVeg: ms.reduce((s, m) => s + (m.fruit_veg ?? 0), 0),
      protein: ms.filter((m) => m.protein).length,
      eaten: scored.length ? scored.reduce((s, m) => s + EATEN_SCORE[m.eaten!], 0) / scored.length : null,
    })
  }
  return out
}

export function weekSummary(days: DayIntake[]): { mealsLogged: number; avgFruitVeg: number; proteinDays: number; avgEaten: number | null } {
  const logged = days.filter((d) => d.meals > 0)
  const eatenDays = days.filter((d) => d.eaten !== null)
  return {
    mealsLogged: days.reduce((s, d) => s + d.meals, 0),
    avgFruitVeg: logged.length ? days.reduce((s, d) => s + d.fruitVeg, 0) / logged.length : 0,
    proteinDays: days.filter((d) => d.protein > 0).length,
    avgEaten: eatenDays.length ? eatenDays.reduce((s, d) => s + d.eaten!, 0) / eatenDays.length : null,
  }
}
