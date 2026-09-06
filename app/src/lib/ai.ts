// Calls the reading function. Photos are shrunk on the phone first so a shelf costs a cent or two.
import { supabase } from './supabase'
import { stockState, stockMap } from './stockState.svelte'
import type { Item } from './db/types'

export type Kind = 'message' | 'shelf_photo' | 'receipt' | 'plate' | 'recipe_url' | 'lunchbox' | 'child_plate'
export interface Match { item_id: string | null; item_name: string }
export interface MessageResult { events: (Match & { type: 'finished' | 'used' | 'bought' | 'count' | 'wasted' | 'produced'; quantity: number; note: string | null })[]; list_lines: (Match & { quantity: number })[]; unmatched: string[] }
export interface ShelfResult { items: (Match & { quantity: number; unit: string; confidence: 'high' | 'medium' | 'low'; partly_hidden: boolean; is_new: boolean })[]; view: 'clear' | 'crowded' }
export interface ReceiptResult { shop: string | null; date: string | null; total: number | null; lines: (Match & { text: string; quantity: number; price: number | null; is_food_or_household: boolean })[] }
export interface RecipeResult { title: string; servings: number | null; prep_minutes: number | null; cook_minutes: number | null; ingredients: (Match & { quantity: number | null; unit: string | null; optional: boolean })[]; steps: string; tags: string[]; notes: string | null }
export interface LunchboxResult { items: (Match & { state: 'full' | 'partly_eaten' | 'gone' | 'untouched'; confidence: 'high' | 'medium' | 'low' })[]; notes: string | null }
export interface ChildPlateResult { description: string; items: (Match & { confidence: 'high' | 'medium' | 'low' })[]; eaten: 'all' | 'most' | 'some' | 'little' | 'none' | null; fruit_veg: number; protein: boolean; notes: string | null }
export type Result = MessageResult | ShelfResult | ReceiptResult | RecipeResult | LunchboxResult | ChildPlateResult
export type Mode = 'packed' | 'home' | 'before' | 'after'

export const aiAvailable = () => supabase !== null

export async function shrinkImage(file: File, max = 1280, quality = 0.82): Promise<{ data: string; media_type: 'image/jpeg' }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { data: dataUrl.split(',')[1], media_type: 'image/jpeg' }
}

function catalogue(): { id: string; name: string; aliases: string[]; unit: string; pack_size: number; location: string; stock: number | null }[] {
  const stock = stockMap(stockState.items, stockState.events)
  return stockState.items.filter((i: Item) => !i.archived).map((i) => ({ id: i.id, name: i.name, aliases: i.aliases, unit: i.unit, pack_size: i.pack_size, location: i.location, stock: stock.get(i.id)?.stock ?? null }))
}

export async function parse<T extends Result>(kind: Kind, payload: { text?: string; url?: string; location?: string; mode?: Mode; image?: { data: string; media_type: string } }): Promise<T> {
  if (!supabase) throw new Error('Reading needs the online version of the app.')
  const { data, error } = await supabase.functions.invoke('parse', { body: { kind, ...payload, catalogue: catalogue() } })
  if (error) {
    // supabase-js wraps non-2xx responses; try to surface the function's own message
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') msg = (await ctx.json()).error ?? msg
    } catch { /* keep msg */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data.result as T
}
