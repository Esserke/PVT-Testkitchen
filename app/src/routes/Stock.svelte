<script lang="ts">
  import { liveQuery } from 'dexie'
  import { db } from '../lib/db/schema'
  import { put, newId, softDelete } from '../lib/db/repo'
  import { household } from '../lib/household.svelte'
  import { LOCATIONS, CATEGORIES, UNITS } from '../lib/constants'
  import type { Item, TrackingMode } from '../lib/db/types'
  import { importStarterCatalogue } from '../lib/seed'

  let importing = $state(false)
  let imported = $state<number | null>(null)
  async function loadStarter() {
    if (!household.id) return
    importing = true
    imported = await importStarterCatalogue(household.id)
    importing = false
  }

  let items = $state<Item[]>([])
  $effect(() => {
    const id = household.id
    if (!id) return
    const sub = liveQuery(() =>
      db.item.where('household_id').equals(id).filter((i) => !i.deleted && !i.archived).sortBy('name'),
    ).subscribe((rows) => (items = rows))
    return () => sub.unsubscribe()
  })

  const byLocation = $derived.by(() => {
    const m = new Map<string, Item[]>()
    for (const i of items) m.set(i.location, [...(m.get(i.location) ?? []), i])
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  })

  let adding = $state(false)
  let name = $state('')
  let location = $state<string>(LOCATIONS[0])
  let category = $state<string>(CATEGORIES[2])
  let unit = $state<string>(UNITS[0])
  let par = $state<number | null>(null)
  let mode = $state<TrackingMode>('count')

  async function add(e: Event) {
    e.preventDefault()
    if (!household.id || !name.trim()) return
    const row: Item = {
      id: newId(), household_id: household.id, updated_at: '', deleted: false,
      name: name.trim(), aliases: [], category, location, unit, pack_size: 1, par_level: par,
      tracking_mode: mode, preferred_shop: null, typical_price_zar: null, bulk_ok: false,
      source: 'bought', perishable_days: null, snackbox_ok: false, kid_ok: true, archived: false,
    }
    await put('item', row)
    name = ''
    par = null
    adding = false
  }
</script>

<div class="page">
  {#if adding}
    <form class="card" onsubmit={add} style="margin-bottom:16px">
      <div class="field">
        <label for="n">Name</label>
        <input id="n" bind:value={name} required placeholder="Full cream milk" />
      </div>
      <div class="row">
        <div class="field" style="flex:1">
          <label for="l">Where</label>
          <select id="l" bind:value={location}>{#each LOCATIONS as l}<option value={l}>{l}</option>{/each}</select>
        </div>
        <div class="field" style="flex:1">
          <label for="c">Category</label>
          <select id="c" bind:value={category}>{#each CATEGORIES as c}<option value={c}>{c}</option>{/each}</select>
        </div>
      </div>
      <div class="row">
        <div class="field" style="flex:1">
          <label for="u">Unit</label>
          <select id="u" bind:value={unit}>{#each UNITS as u}<option value={u}>{u}</option>{/each}</select>
        </div>
        <div class="field" style="flex:1">
          <label for="p">Keep at least</label>
          <input id="p" type="number" min="0" step="any" bind:value={par} inputmode="decimal" />
        </div>
        <div class="field" style="flex:1">
          <label for="m">Track by</label>
          <select id="m" bind:value={mode}>
            <option value="count">count</option><option value="level">level</option><option value="cycle">cycle</option>
          </select>
        </div>
      </div>
      <div class="row">
        <button type="submit">Add item</button>
        <button type="button" class="ghost" onclick={() => (adding = false)}>Cancel</button>
      </div>
    </form>
  {:else}
    <div class="row" style="margin-bottom:16px">
      <button onclick={() => (adding = true)}>Add item</button>
      <button class="ghost" onclick={loadStarter} disabled={importing}>{importing ? 'Loading' : 'Load starter catalogue'}</button>
    </div>
    {#if imported !== null}
      <p class="muted" style="margin-top:-8px">{imported === 0 ? 'Everything in the starter catalogue is already here.' : `Added ${imported} items from the kitchen photos.`}</p>
    {/if}
  {/if}

  {#if items.length === 0}
    <div class="empty">Nothing here yet. Load the starter catalogue drafted from the kitchen photos, or add the first thing you can see in the pantry.</div>
  {:else}
    {#each byLocation as [loc, rows] (loc)}
      <p class="eyebrow" style="margin:8px 0 6px">{loc}</p>
      <div class="list" style="margin-bottom:14px">
        {#each rows as it (it.id)}
          <div class="card row" style="padding:10px 12px">
            <div style="flex:1">
              <div>{it.name}</div>
              <div class="muted" style="font-size:12.5px">{it.category} · {it.unit}{it.par_level != null ? ` · keep ≥ ${it.par_level}` : ''} · {it.tracking_mode}</div>
            </div>
            <button class="ghost" onclick={() => softDelete('item', it.id)} aria-label="Remove {it.name}">Remove</button>
          </div>
        {/each}
      </div>
    {/each}
  {/if}
</div>
