<script lang="ts">
  import { put, newId } from '../lib/db/repo'
  import { household } from '../lib/household.svelte'
  import { go } from '../lib/router.svelte'
  import { LOCATIONS, CATEGORIES, UNITS } from '../lib/constants'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { formatStock, type StockStatus } from '../lib/domain/stock'
  import { importStarterCatalogue } from '../lib/seed'
  import { countDuplicates } from '../lib/actions'
  const duplicates = $derived(countDuplicates(stockState.items, stockState.events))
  import QuickSheet from '../components/QuickSheet.svelte'
  import StatusPill from '../components/StatusPill.svelte'
  import type { Item, TrackingMode } from '../lib/db/types'

  const stock = $derived(stockMap(stockState.items, stockState.events))
  let q = $state('')
  let filter = $state<'all' | StockStatus>('all')

  const visible = $derived.by(() => {
    const needle = q.trim().toLowerCase()
    return stockState.items.filter((i) => {
      if (i.archived) return false
      if (filter !== 'all' && stock.get(i.id)?.status !== filter) return false
      if (!needle) return true
      return i.name.toLowerCase().includes(needle) || i.aliases.some((a) => a.toLowerCase().includes(needle))
    })
  })
  const byLocation = $derived.by(() => {
    const m = new Map<string, Item[]>()
    for (const i of visible) m.set(i.location, [...(m.get(i.location) ?? []), i])
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  })
  const counts = $derived.by(() => {
    const c = { low: 0, out: 0, unknown: 0 }
    for (const i of stockState.items) {
      if (i.archived) continue
      const s = stock.get(i.id)?.status
      if (s === 'low' || s === 'out' || s === 'unknown') c[s]++
    }
    return c
  })

  let sheetItem = $state<Item | null>(null)
  let importing = $state(false)
  let imported = $state<number | null>(null)
  async function loadStarter() {
    if (!household.id) return
    importing = true
    imported = await importStarterCatalogue(household.id)
    importing = false
  }

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
      source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false,
    }
    await put('item', row)
    name = ''
    par = null
    adding = false
    go('item', row.id)
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
    <div class="row" style="margin-bottom:12px">
      <input bind:value={q} placeholder="Search" aria-label="Search items" />
      <button onclick={() => (adding = true)}>Add</button>
    </div>
    <div class="row chips" style="margin-bottom:14px">
      <button class:ghost={filter !== 'all'} onclick={() => (filter = 'all')}>All</button>
      <button class:ghost={filter !== 'out'} onclick={() => (filter = 'out')}>Out · {counts.out}</button>
      <button class:ghost={filter !== 'low'} onclick={() => (filter = 'low')}>Low · {counts.low}</button>
      <button class:ghost={filter !== 'unknown'} onclick={() => (filter = 'unknown')}>Uncounted · {counts.unknown}</button>
    </div>
  {/if}

  {#if !stockState.ready}
    <div class="empty">Loading</div>
  {:else if stockState.items.length === 0}
    <div class="empty">
      <p>Nothing here yet.</p>
      <button onclick={loadStarter} disabled={importing}>{importing ? 'Loading' : 'Load starter catalogue'}</button>
      <p class="muted" style="margin-top:10px;font-size:13px">124 items drafted from the kitchen photos. Or add the first thing you can see in the pantry.</p>
    </div>
  {:else}
    {#if duplicates}
      <p class="muted" style="margin:-4px 0 12px;font-size:13.5px">{duplicates} item{duplicates === 1 ? ' appears' : 's appear'} twice. <button class="ghost" style="padding:4px 8px;font-size:13px" onclick={() => go('settings')}>Merge in Settings</button></p>
    {/if}
    {#if imported !== null}
      <p class="muted">{imported === 0 ? 'Everything in the starter catalogue is already here.' : `Added ${imported} items.`}</p>
    {/if}
    {#if visible.length === 0}
      <div class="empty">Nothing matches.</div>
    {/if}
    {#each byLocation as [loc, rows] (loc)}
      <p class="eyebrow" style="margin:8px 0 6px">{loc}</p>
      <div class="card" style="padding:0 12px;margin-bottom:14px">
        {#each rows as it (it.id)}
          {@const s = stock.get(it.id)}
          <div class="row line">
            <button class="name" onclick={() => go('item', it.id)}>
              <span>{it.name}</span>
              <span class="muted mono" style="font-size:12.5px">{formatStock(it, s?.stock ?? null)}{it.par_level != null && it.tracking_mode === 'count' ? ` · keep ${it.par_level}` : ''}</span>
            </button>
            <StatusPill status={s?.status ?? 'unknown'} />
            <button class="more" onclick={() => (sheetItem = it)} aria-label="Update {it.name}">···</button>
          </div>
        {/each}
      </div>
    {/each}
    {#if filter === 'all' && !q}
      <p style="text-align:center"><button class="ghost" onclick={loadStarter} disabled={importing}>Add missing starter items</button></p>
    {/if}
  {/if}
</div>

{#if sheetItem}
  <QuickSheet item={sheetItem} stock={stock.get(sheetItem.id)} onclose={() => (sheetItem = null)} />
{/if}

<style>
  .chips { flex-wrap: wrap; }
  .chips button { padding: 7px 11px; font-size: 13px; }
  .line { padding: 8px 0; border-bottom: 1px solid var(--rule-soft); }
  .line:last-child { border-bottom: 0; }
  .name { flex: 1; background: none; color: var(--ink); text-align: left; padding: 0; display: flex; flex-direction: column; gap: 2px; font-weight: 400; }
  .more { background: none; color: var(--muted); padding: 4px 6px; }
</style>
