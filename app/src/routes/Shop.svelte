<script lang="ts">
  import { liveQuery } from 'dexie'
  import { db } from '../lib/db/schema'
  import { household } from '../lib/household.svelte'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { belowParItems, reconcile, groupByShop, mergeNeeds } from '../lib/domain/list'
  import { planNeeds, planLines, toIsoDate, addDays } from '../lib/domain/plan'
  import { planState, ingredientsByRecipe } from '../lib/planState.svelte'
  import { forecastMap } from '../lib/forecastState.svelte'
  import { predictedNeeds } from '../lib/domain/forecast'
  import { newTrip, addLine, saveLine, closeTrip, bought, undoEvent } from '../lib/actions'
  import { softDelete, put } from '../lib/db/repo'
  import { showToast } from '../lib/toast.svelte'
  import { SHOPS } from '../lib/constants'
  import type { Item, ListLine, Trip } from '../lib/db/types'

  let trip = $state<Trip | null>(null)
  let lines = $state<ListLine[]>([])
  let loaded = $state(false)

  $effect(() => {
    const id = household.id
    if (!id) return
    const sub = liveQuery(() => db.trip.where('household_id').equals(id).filter((t) => !t.deleted && t.status === 'open').first()).subscribe((t) => {
      trip = t ?? null
      loaded = true
    })
    return () => sub.unsubscribe()
  })
  $effect(() => {
    const t = trip
    if (!t) {
      lines = []
      return
    }
    const sub = liveQuery(() => db.list_line.where('trip_id').equals(t.id).filter((l) => !l.deleted).toArray()).subscribe((rows) => (lines = rows))
    return () => sub.unsubscribe()
  })

  const stock = $derived(stockMap(stockState.items, stockState.events))
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  // The list covers today until a week after the trip: what is low now, plus what the planned meals need.
  const today = toIsoDate(new Date())
  const window = $derived({ from: today, to: addDays(trip?.planned_date && trip.planned_date > today ? trip.planned_date : today, 7) })
  const fromPlan = $derived(planLines(planNeeds(planState.slots, new Map(planState.recipes.map((r) => [r.id, r])), ingredientsByRecipe(planState.ingredients), itemsById, window.from, window.to), itemsById, stock))
  // Anything forecast to run out before the trip after this one goes on this trip.
  const predicted = $derived(predictedNeeds(stockState.items, forecastMap(), window.to))
  const needed = $derived(mergeNeeds(belowParItems(stockState.items, stock), fromPlan, predicted))
  const diff = $derived(reconcile(lines, needed))
  const grouped = $derived(groupByShop(lines.map((l) => ({ ...l, shop: l.shop ?? itemsById.get(l.item_id ?? '')?.preferred_shop ?? null }))))
  const remaining = $derived(lines.filter((l) => !l.checked).length)

  function nextSaturday(): string {
    const d = new Date()
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
    return d.toISOString().slice(0, 10)
  }
  let date = $state(nextSaturday())

  async function start() {
    await newTrip(date)
  }
  async function update() {
    if (!trip) return
    for (const n of diff.add) {
      await addLine(trip, { item_id: n.item.id, free_text: null, quantity: n.quantity, reason: n.reason, shop: n.item.preferred_shop, checked: false, price_paid_zar: null, event_id: null })
    }
    for (const l of diff.update) await saveLine(l)
    for (const l of diff.remove) await softDelete('list_line', l.id)
    showToast(`${diff.add.length} added, ${diff.update.length} changed, ${diff.remove.length} removed`)
  }
  // Refresh automatically when the list is opened and stock is known.
  let autoDone = $state(false)
  $effect(() => {
    if (trip && stockState.ready && planState.ready && !autoDone && (diff.add.length || diff.remove.length || diff.update.length)) {
      autoDone = true
      void update()
    }
  })

  async function toggle(l: ListLine) {
    const item = l.item_id ? itemsById.get(l.item_id) : undefined
    if (!l.checked) {
      let event_id: string | null = null
      if (item) event_id = (await bought(item, l.quantity ?? 1, l.price_paid_zar, 'shopping', l.shop ?? item.preferred_shop ?? undefined)).id
      await saveLine({ ...l, checked: true, event_id })
    } else {
      if (l.event_id) await undoEvent(l.event_id)
      await saveLine({ ...l, checked: false, event_id: null })
    }
  }
  async function setPrice(l: ListLine, v: string) {
    const price = v === '' ? null : Number(v)
    await saveLine({ ...l, price_paid_zar: price })
    if (l.event_id) {
      const ev = await db.stock_event.get(l.event_id)
      if (ev) await put('stock_event', { ...ev, price_zar: price })
    }
  }

  let manual = $state('')
  let manualShop = $state<string | null>(null)
  async function addManual(e: Event) {
    e.preventDefault()
    if (!trip || !manual.trim()) return
    const needle = manual.trim().toLowerCase()
    const match: Item | undefined = stockState.items.find((i) => i.name.toLowerCase() === needle || i.aliases.some((a) => a.toLowerCase() === needle))
    await addLine(trip, {
      item_id: match?.id ?? null, free_text: match ? null : manual.trim(), quantity: 1, reason: 'manual',
      shop: manualShop ?? match?.preferred_shop ?? null, checked: false, price_paid_zar: null, event_id: null,
    })
    manual = ''
  }
  async function finish() {
    if (!trip) return
    await closeTrip(trip)
    showToast('Trip done. Unticked lines were dropped.')
  }
  const label = (l: ListLine) => (l.item_id ? itemsById.get(l.item_id)?.name ?? '?' : l.free_text ?? '?')
  const qty = (l: ListLine) => {
    const item = l.item_id ? itemsById.get(l.item_id) : undefined
    if (!item) return l.quantity ?? 1
    return `${l.quantity ?? 1} × ${item.pack_size !== 1 ? `${item.pack_size} ${item.unit}` : item.unit}`
  }
</script>

<div class="page">
  {#if !loaded}
    <div class="empty">Loading</div>
  {:else if !trip}
    <div class="card">
      <p class="eyebrow">Next town trip</p>
      <p class="muted">Start a trip and the list fills itself with everything that is low, plus what the planned meals need.</p>
      <div class="row">
        <input type="date" bind:value={date} aria-label="Trip date" />
        <button onclick={start}>Start trip</button>
      </div>
      {#if needed.length}<p class="muted" style="margin-top:10px;font-size:13.5px">{needed.length} items are low or out right now.</p>{/if}
    </div>
  {:else}
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div>
        <p class="eyebrow" style="margin:0">Trip · {trip.planned_date ? new Date(trip.planned_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'undated'}</p>
        <span class="muted" style="font-size:13.5px">{remaining} to get</span>
      </div>
      <div class="row">
        <button class="ghost" onclick={update} disabled={!diff.add.length && !diff.remove.length && !diff.update.length}>Update</button>
        <button class="ghost" onclick={finish}>Finish</button>
      </div>
    </div>

    <form onsubmit={addManual} class="row" style="margin-bottom:16px">
      <input bind:value={manual} placeholder="Add something…" list="items" aria-label="Add to list" />
      <datalist id="items">{#each stockState.items as i (i.id)}<option value={i.name}></option>{/each}</datalist>
      <select bind:value={manualShop} style="width:auto" aria-label="Shop"><option value={null}>Any</option>{#each SHOPS as s}<option value={s}>{s}</option>{/each}</select>
      <button type="submit" disabled={!manual.trim()}>Add</button>
    </form>

    {#if lines.length === 0}
      <div class="empty">Nothing on the list. Everything is at or above its keep-at-least level.</div>
    {/if}
    {#each grouped as [shop, rows] (shop)}
      <p class="eyebrow" style="margin:8px 0 6px">{shop}</p>
      <div class="card" style="padding:0 12px;margin-bottom:14px">
        {#each rows.sort((a, b) => Number(a.checked) - Number(b.checked) || label(a).localeCompare(label(b))) as l (l.id)}
          <div class="row line" class:done={l.checked}>
            <input type="checkbox" checked={l.checked} onchange={() => toggle(l)} style="width:22px;height:22px" aria-label="Got {label(l)}" />
            <div style="flex:1">
              <div>{label(l)}</div>
              <div class="muted" style="font-size:12.5px">{qty(l)}{l.reason === 'below_par' ? ' · low' : l.reason === 'plan' ? ' · for meals' : l.reason === 'predicted' ? ' · will run out' : ''}</div>
            </div>
            <input class="price mono" type="number" inputmode="decimal" min="0" step="0.01" placeholder="R" value={l.price_paid_zar ?? ''} onchange={(e) => setPrice(l, (e.currentTarget as HTMLInputElement).value)} aria-label="Price paid" />
            <button class="more" onclick={() => softDelete('list_line', l.id)} aria-label="Remove {label(l)}">×</button>
          </div>
        {/each}
      </div>
    {/each}
  {/if}
</div>

<style>
  .line { padding: 8px 0; border-bottom: 1px solid var(--rule-soft); }
  .line:last-child { border-bottom: 0; }
  .done > div { text-decoration: line-through; color: var(--muted); }
  .price { width: 84px; padding: 6px 8px; font-size: 13.5px; }
  .more { background: none; color: var(--muted); padding: 4px 8px; font-size: 18px; }
</style>
