// Live view of recipes, ideas and the meal plan. Shared by Plan, Recipes, Shop and Today.
import { liveQuery, type Subscription } from 'dexie'
import { db } from './db/schema'
import type { Idea, MealSlot, Recipe, RecipeIngredient } from './db/types'

export const planState = $state<{ recipes: Recipe[]; ingredients: RecipeIngredient[]; ideas: Idea[]; slots: MealSlot[]; ready: boolean }>({
  recipes: [], ingredients: [], ideas: [], slots: [], ready: false,
})

let subs: Subscription[] = []
let current: string | null = null

export function watchPlan(householdId: string | null): void {
  if (householdId === current) return
  current = householdId
  for (const s of subs) s.unsubscribe()
  subs = []
  planState.ready = false
  if (!householdId) return
  const live = <T extends { deleted: boolean }>(t: string) => liveQuery(() => db.table(t).where('household_id').equals(householdId).filter((r: T) => !r.deleted).toArray() as Promise<T[]>)
  subs.push(
    live<Recipe>('recipe').subscribe((r) => { planState.recipes = r.sort((a, b) => a.title.localeCompare(b.title)); planState.ready = true }),
    live<RecipeIngredient>('recipe_ingredient').subscribe((r) => (planState.ingredients = r)),
    live<Idea>('idea').subscribe((r) => (planState.ideas = r.sort((a, b) => b.created_at.localeCompare(a.created_at)))),
    live<MealSlot>('meal_slot').subscribe((r) => (planState.slots = r)),
  )
}

export function ingredientsByRecipe(ings: RecipeIngredient[]): Map<string, RecipeIngredient[]> {
  const m = new Map<string, RecipeIngredient[]>()
  for (const i of ings) m.set(i.recipe_id, [...(m.get(i.recipe_id) ?? []), i])
  return m
}

export function slotAt(slots: MealSlot[], date: string, slot: MealSlot['slot']): MealSlot | undefined {
  return slots.find((s) => s.date === date && s.slot === slot)
}
