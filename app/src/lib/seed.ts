// Starter catalogue drafted from photos of the kitchen, freezers, pantry,
// cleaning cupboard and drinks fridge. Edit src/data/items.csv to change it.
import csv from '../data/items.csv?raw'
import { db } from './db/schema'
import { put, newId } from './db/repo'
import type { Item, ItemSource, TrackingMode } from './db/types'

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(',')
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]))
  })
}

export function starterCatalogue(householdId: string): Item[] {
  return parseCsv(csv).map((r) => ({
    id: newId(),
    household_id: householdId,
    updated_at: '',
    deleted: false,
    name: r.name,
    aliases: r.aliases ? r.aliases.split('|').map((a) => a.trim()).filter(Boolean) : [],
    category: r.category,
    location: r.location,
    unit: r.unit,
    pack_size: Number(r.pack_size || 1),
    par_level: r.par_level === '' ? null : Number(r.par_level),
    tracking_mode: (r.tracking_mode || 'count') as TrackingMode,
    preferred_shop: r.preferred_shop || null,
    typical_price_zar: null,
    bulk_ok: false,
    source: (r.source || 'bought') as ItemSource,
    perishable_days: null,
    snackbox_ok: r.snackbox_ok === 'true',
    kid_ok: r.kid_ok !== 'false',
    archived: false,
  }))
}

// Adds every catalogue item whose name is not already present. Returns how many were added.
export async function importStarterCatalogue(householdId: string): Promise<number> {
  const existing = new Set(
    (await db.item.where('household_id').equals(householdId).toArray()).map((i) => i.name.toLowerCase()),
  )
  let added = 0
  for (const item of starterCatalogue(householdId)) {
    if (existing.has(item.name.toLowerCase())) continue
    await put('item', item)
    added++
  }
  return added
}
