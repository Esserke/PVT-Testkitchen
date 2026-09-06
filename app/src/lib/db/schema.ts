import Dexie, { type Table } from 'dexie'
import type {
  Budget, Capture, ChildMeal, ChildMetric, Idea, Item, ListLine, MealSlot, MetaEntry, OutboxEntry, Recipe, RecipeIngredient,
  SchoolTerm, StockEvent, SyncedTable, Trip,
} from './types'

export class LarderDB extends Dexie {
  item!: Table<Item, string>
  stock_event!: Table<StockEvent, string>
  capture!: Table<Capture, string>
  recipe!: Table<Recipe, string>
  recipe_ingredient!: Table<RecipeIngredient, string>
  idea!: Table<Idea, string>
  meal_slot!: Table<MealSlot, string>
  trip!: Table<Trip, string>
  list_line!: Table<ListLine, string>
  school_calendar!: Table<SchoolTerm, string>
  child_meal!: Table<ChildMeal, string>
  child_metric!: Table<ChildMetric, string>
  budget!: Table<Budget, string>
  outbox!: Table<OutboxEntry, number>
  meta!: Table<MetaEntry, string>

  constructor() {
    super('larder')
    this.version(1).stores({
      item: 'id, household_id, location, category, name, updated_at',
      stock_event: 'id, household_id, item_id, at, updated_at',
      capture: 'id, household_id, status, created_at, updated_at',
      recipe: 'id, household_id, title, updated_at',
      recipe_ingredient: 'id, household_id, recipe_id, item_id, updated_at',
      idea: 'id, household_id, status, updated_at',
      meal_slot: 'id, household_id, date, [date+slot], updated_at',
      trip: 'id, household_id, status, planned_date, updated_at',
      list_line: 'id, household_id, trip_id, item_id, updated_at',
      school_calendar: 'id, household_id, term_start, updated_at',
      outbox: '++id, [table+row_id], ts',
      meta: 'key',
    })
    this.version(2).stores({
      child_meal: 'id, household_id, date, updated_at',
      child_metric: 'id, household_id, date, updated_at',
      budget: 'id, household_id, category, updated_at',
    })
  }

  synced(table: SyncedTable): Table<any, string> {
    return this.table(table)
  }
}

export const db = new LarderDB()
