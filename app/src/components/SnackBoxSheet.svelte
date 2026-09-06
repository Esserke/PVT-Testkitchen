<script lang="ts">
  import type { MealSlot, Verdict } from '../lib/db/types'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { snackPools, fillSnackBoxes, weekStart, weekDays } from '../lib/domain/plan'
  import { verdictStats } from '../lib/domain/faye'
  import { upsertSlot, cookSlot, clearSlot, setVerdict } from '../lib/actions'
  import { CHILD_NAME, COMPARTMENTS } from '../lib/constants'
  import { showToast } from '../lib/toast.svelte'

  let { date, existing, onclose }: { date: string; existing: MealSlot | undefined; onclose: () => void } = $props()
  const pools = $derived(snackPools(stockState.items))
  const stock = $derived(stockMap(stockState.items, stockState.events))
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const stats = $derived(verdictStats(planState.slots))
  const scores = $derived(new Map([...stats].map(([id, st]) => [id, st.score])))
  const chosen = $derived(new Set(existing?.item_ids ?? []))
  const packed = $derived(existing?.status === 'cooked')
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
    const box = fillSnackBoxes([date], pools, others, lastUsed, stock, scores).get(date) ?? []
    await upsertSlot(existing, date, 'school_snackbox', { item_ids: box })
  }
  async function saveNotes() {
    if (existing) await upsertSlot(existing, date, 'school_snackbox', { notes: notes.trim() || null })
  }
  async function markPacked() {
    if (!existing) return
    await cookSlot(existing, null, [], itemsById)
    showToast('Packed. Items deducted from stock.')
  }
  const NEXT: Record<string, Verdict | null> = { none: 'ate', ate: 'some', some: 'left', left: null }
  async function cycle(id: string) {
    if (!existing) return
    const cur = existing.item_verdicts?.[id] ?? 'none'
    await setVerdict(existing, id, NEXT[cur])
  }
  const mark = (v: Verdict | undefined) => (v === 'ate' ? '✓ ate' : v === 'some' ? '~ some' : v === 'left' ? '✗ left' : 'tap')
  const pretty = $derived(new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }))
  const hint = (id: string) => {
    const st = stats.get(id)
    if (!st || st.ate + st.some + st.left === 0) return ''
    return st.score >= 0.7 ? ' ♥' : st.score < 0.4 ? ' ↓' : ''
  }
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-label="{CHILD_NAME}'s snack box for {pretty}">
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <div><h2>{CHILD_NAME}'s box</h2><div class="muted" style="font-size:13px">{pretty}</div></div>
    <div class="row">
      {#if !packed}<button class="ghost" onclick={auto}>Auto-fill</button>{/if}
      <button class="ghost" onclick={onclose}>Close</button>
    </div>
  </div>
  <div class="scroll">
    {#if existing && existing.item_ids.length}
      <div class="card" style="margin-bottom:12px;background:var(--ochre-soft);border-color:transparent">
        <p class="eyebrow" style="margin-bottom:6px">{packed ? 'How did it go? Tap each item' : 'In the box'}</p>
        <div class="chips">
          {#each existing.item_ids as id (id)}
            {#if packed}
              <button class="ghost chip verdict" class:ate={existing.item_verdicts?.[id] === 'ate'} class:some={existing.item_verdicts?.[id] === 'some'} class:left={existing.item_verdicts?.[id] === 'left'} onclick={() => cycle(id)}>
                {itemsById.get(id)?.name ?? '?'} · {mark(existing.item_verdicts?.[id])}
              </button>
            {:else}
              <button class="ghost chip on" onclick={() => toggle(id)}>{itemsById.get(id)?.name ?? '?'} ×</button>
            {/if}
          {/each}
        </div>
        <div class="row" style="margin-top:10px">
          {#if !packed}<button onclick={markPacked}>Packed</button>{:else}<span class="pill">packed</span>{/if}
          <button class="ghost" onclick={() => clearSlot(existing!).then(onclose)}>Clear</button>
        </div>
      </div>
    {/if}

    {#if !packed}
      {#each COMPARTMENTS as comp (comp.label)}
        <p class="eyebrow" style="margin:8px 0 6px">{comp.label}</p>
        <div class="chips">
          {#each comp.components as c (c)}
            {#each pools[c] as i (i.id)}
              {@const s = stock.get(i.id)?.status}
              <button class="ghost chip" class:on={chosen.has(i.id)} class:out={s === 'out'} onclick={() => toggle(i.id)}>{i.name}{hint(i.id)}{s === 'out' ? ' · out' : ''}</button>
            {/each}
          {/each}
          {#if comp.components.every((c) => pools[c].length === 0)}
            <p class="muted" style="font-size:13px;margin:0">Nothing marked for this compartment yet. Tick "Snack box" on an item under Stock.</p>
          {/if}
        </div>
      {/each}
      {#if pools.drink.length}
        <p class="eyebrow" style="margin:8px 0 6px">Drink · optional</p>
        <div class="chips">{#each pools.drink as i (i.id)}<button class="ghost chip" class:on={chosen.has(i.id)} onclick={() => toggle(i.id)}>{i.name}</button>{/each}</div>
      {/if}
    {/if}

    <div class="field" style="margin-top:14px">
      <label for="cb">Anything else to remember</label>
      <input id="cb" bind:value={notes} onblur={saveNotes} placeholder="Asked for the strawberries again" />
    </div>
    <p class="muted" style="font-size:12px;margin:0">♥ she usually eats it · ↓ it usually comes back</p>
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
  .verdict.ate { border-color: var(--moss); color: var(--moss); }
  .verdict.some { border-color: var(--ochre); color: var(--ochre); }
  .verdict.left { border-color: var(--danger); color: var(--danger); }
</style>
