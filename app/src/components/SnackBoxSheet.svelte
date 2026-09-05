<script lang="ts">
  import type { MealSlot } from '../lib/db/types'
  import { SNACK_COMPONENTS } from '../lib/db/types'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { snackPools, fillSnackBoxes, weekStart, weekDays } from '../lib/domain/plan'
  import { upsertSlot, cookSlot, clearSlot } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'

  let { date, existing, onclose }: { date: string; existing: MealSlot | undefined; onclose: () => void } = $props()
  const pools = $derived(snackPools(stockState.items))
  const stock = $derived(stockMap(stockState.items, stockState.events))
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const chosen = $derived(new Set(existing?.item_ids ?? []))
  let notes = $state('')
  $effect(() => {
    notes = existing?.notes ?? ''
  })

  async function toggle(id: string) {
    const ids = existing?.item_ids ?? []
    await upsertSlot(existing, date, 'school_snackbox', { item_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
  }
  async function auto() {
    const week = weekDays(weekStart(date))
    const others = new Map(planState.slots.filter((s) => s.slot === 'school_snackbox' && s.date !== date && week.includes(s.date)).map((s) => [s.date, s.item_ids]))
    const lastUsed = new Map<string, string>()
    for (const s of planState.slots) if (s.slot === 'school_snackbox') for (const id of s.item_ids) if ((lastUsed.get(id) ?? '') < s.date) lastUsed.set(id, s.date)
    const box = fillSnackBoxes([date], pools, others, lastUsed, stock).get(date) ?? []
    await upsertSlot(existing, date, 'school_snackbox', { item_ids: box })
  }
  async function saveNotes() {
    if (existing) await upsertSlot(existing, date, 'school_snackbox', { notes: notes.trim() || null })
  }
  async function packed() {
    if (!existing) return
    await cookSlot(existing, null, [], itemsById)
    showToast('Packed. Items deducted from stock.')
    onclose()
  }
  const pretty = $derived(new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }))
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-label="Snack box for {pretty}">
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <div><h2>Snack box</h2><div class="muted" style="font-size:13px">{pretty}</div></div>
    <div class="row">
      <button class="ghost" onclick={auto}>Auto-fill</button>
      <button class="ghost" onclick={onclose}>Close</button>
    </div>
  </div>
  <div class="scroll">
    {#each SNACK_COMPONENTS as c (c)}
      <p class="eyebrow" style="margin:8px 0 6px">{c}</p>
      {#if pools[c].length === 0}
        <p class="muted" style="font-size:13px">No {c} items are marked for the snack box yet. Tick "Snack box" on an item under Stock.</p>
      {:else}
        <div class="chips">
          {#each pools[c] as i (i.id)}
            {@const s = stock.get(i.id)?.status}
            <button class="ghost chip" class:on={chosen.has(i.id)} class:out={s === 'out'} onclick={() => toggle(i.id)}>{i.name}{s === 'out' ? ' · out' : s === 'low' ? ' · low' : ''}</button>
          {/each}
        </div>
      {/if}
    {/each}
    <div class="field" style="margin-top:14px">
      <label for="cb">What came back uneaten</label>
      <input id="cb" bind:value={notes} onblur={saveNotes} placeholder="Half the cucumber" />
    </div>
    <div class="row" style="margin-top:6px">
      {#if existing && existing.item_ids.length && existing.status !== 'cooked'}<button onclick={packed}>Packed</button>{/if}
      {#if existing?.status === 'cooked'}<span class="pill">packed</span>{/if}
      {#if existing}<button class="ghost" onclick={() => clearSlot(existing!).then(onclose)}>Clear</button>{/if}
    </div>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface); border-radius: 16px 16px 0 0;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; max-height: 85vh; display: flex; flex-direction: column; }
  .scroll { overflow-y: auto; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 7px 11px; font-size: 13.5px; }
  .chip.on { background: var(--ochre); color: #fff; border-color: var(--ochre); }
  .chip.out { opacity: .5; }
</style>
