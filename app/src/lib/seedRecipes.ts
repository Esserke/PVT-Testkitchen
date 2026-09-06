import { STARTER_RECIPES } from '../data/recipes'
import { db } from './db/schema'
import { put, newId } from './db/repo'
import { starterCatalogue } from './seed'
import type { Item, Recipe, RecipeIngredient } from './db/types'

function findItem(items: Item[], name: string): Item | undefined {
  const n = name.trim().toLowerCase()
  return items.find((i) => !i.deleted && (i.name.toLowerCase() === n || i.aliases.some((a) => a.toLowerCase() === n)))
}

// Adds starter recipes that are not already present (by title). Ingredients link to
// catalogue items; a catalogue item the household lacks is created first.
export async function importStarterRecipes(householdId: string): Promise<number> {
  const existing = await db.recipe.where('household_id').equals(householdId).filter((r) => !r.deleted).toArray()
  const titles = new Set(existing.map((r) => r.title.toLowerCase()))
  let items = await db.item.where('household_id').equals(householdId).filter((i) => !i.deleted).toArray()
  const catalogue = starterCatalogue(householdId)
  let added = 0
  for (const sr of STARTER_RECIPES) {
    if (titles.has(sr.title.toLowerCase())) continue
    const recipe: Recipe = {
      id: newId(), household_id: householdId, updated_at: '', deleted: false,
      title: sr.title, servings: sr.servings, prep_minutes: sr.prep_minutes, cook_minutes: sr.cook_minutes,
      steps: sr.steps, source_url: null, photo_path: null, tags: sr.tags, rating: {}, daughter_verdict: null,
    }
    await put('recipe', recipe)
    for (const ing of sr.ingredients) {
      let item = findItem(items, ing.name)
      if (!item) {
        const def = findItem(catalogue, ing.name)
        if (def) {
          item = await put('item', { ...def, id: newId() })
          items = [...items, item]
        }
      }
      const row: RecipeIngredient = {
        id: newId(), household_id: householdId, updated_at: '', deleted: false, recipe_id: recipe.id,
        item_id: item?.id ?? null, free_text: item ? null : ing.name, quantity: ing.quantity, unit: ing.unit, optional: ing.optional ?? false,
      }
      await put('recipe_ingredient', row)
    }
    added++
  }
  return added
}
