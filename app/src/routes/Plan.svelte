<script lang="ts">
  import { planState, slotAt } from '../lib/planState.svelte'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { SLOTS, weekStart, weekDays, addDays, toIsoDate, slotsForDay, snackPools, fillSnackBoxes, suggestDinners, lastCookedByRecipe } from '../lib/domain/plan'
  import { upsertSlot } from '../lib/actions'
  import { go } from '../lib/router.svelte'
  import { showToast } from '../lib/toast.svelte'
  import SlotSheet from '../components/SlotSheet.svelte'
  import SnackBoxSheet from '../components/SnackBoxSheet.svelte'
  import type { MealSlot, MealSlotName } from '../lib/db/types'
  import { verdictStats } from '../lib/domain/faye'
  import { CHILD_NAME } from '../lib/constants'

  const today = toIsoDate(new Date())
  let start = $state(weekStart(today))
  const days = $derived(weekDays(start))
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const recipesById = $derived(new Map(planState.recipes.map((r) => [r.id, r])))
  const stock = $derived(stockMap(stockState.items, stockState.events))

  let open = $state<{ date: string; slot: MealSlotName } | null>(null)
  const openSlot = $derived(open ? slotAt(planState.slots, open.date, open.slot) : undefined)

  function text(s: MealSlot | undefined): string {
    if (!s) return ''
    if (s.recipe_id) return recipesById.get(s.recipe_id)?.title ?? '?'
    if (s.free_text) return s.free_text
    return s.item_ids.map((id) => itemsById.get(id)?.name ?? '?').join(', ')
  }
  const weekLabel = $derived(`${new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${new Date(days[6]).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`)
  const dayName = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })

  async function fillDinners() {
    const empty = days.filter((d) => !text(slotAt(planState.slots, d, 'dinner')))
    const used = new Set(days.map((d) => slotAt(planState.slots, d, 'dinner')?.recipe_id).filter(Boolean) as string[])
    const picks = suggestDinners(planState.recipes, lastCookedByRecipe(planState.slots), empty.length, used)
    if (!picks.length) return showToast('Add a few favourite recipes first.')
    for (let i = 0; i < empty.length && i < picks.length; i++) await upsertSlot(slotAt(planState.slots, empty[i], 'dinner'), empty[i], 'dinner', { recipe_id: picks[i].id, free_text: null, servings: 3 })
    showToast(`${Math.min(empty.length, picks.length)} dinners filled`)
  }
  async function fillBoxes() {
    const existing = new Map(planState.slots.filter((s) => s.slot === 'school_snackbox' && days.includes(s.date) && s.item_ids.length).map((s) => [s.date, s.item_ids]))
    const lastUsed = new Map<string, string>()
    for (const s of planState.slots) if (s.slot === 'school_snackbox') for (const id of s.item_ids) if ((lastUsed.get(id) ?? '') < s.date) lastUsed.set(id, s.date)
    const scores = new Map([...verdictStats(planState.slots)].map(([id, st]) => [id, st.score]))
    const boxes = fillSnackBoxes(days, snackPools(stockState.items), existing, lastUsed, stock, scores)
    let n = 0
    for (const [d, ids] of boxes) {
      if (existing.has(d) || !ids.length) continue
      await upsertSlot(slotAt(planState.slots, d, 'school_snackbox'), d, 'school_snackbox', { item_ids: ids })
      n++
    }
    showToast(n ? `${n} snack boxes filled` : 'Snack boxes already filled, or no snack items marked yet.')
  }
  async function copyLastWeek() {
    let n = 0
    for (const d of days) {
      for (const sl of slotsForDay(d)) {
        if (text(slotAt(planState.slots, d, sl))) continue
        const prev = slotAt(planState.slots, addDays(d, -7), sl)
        if (!prev || !text(prev)) continue
        await upsertSlot(undefined, d, sl, { recipe_id: prev.recipe_id, free_text: prev.free_text, item_ids: prev.item_ids, servings: prev.servings, status: 'planned' })
        n++
      }
    }
    showToast(n ? `${n} meals copied from last week` : 'Nothing to copy.')
  }
</script>

<div class="page">
  <div class="row" style="justify-content:space-between;margin-bottom:10px">
    <button class="ghost" onclick={() => (start = addDays(start, -7))} aria-label="Previous week">‹</button>
    <button class="ghost" onclick={() => (start = weekStart(today))}>{weekLabel}</button>
    <button class="ghost" onclick={() => (start = addDays(start, 7))} aria-label="Next week">›</button>
  </div>
  <div class="row" style="flex-wrap:wrap;margin-bottom:14px">
    <button class="ghost sm" onclick={fillDinners}>Fill dinners</button>
    <button class="ghost sm" onclick={fillBoxes}>Fill snack boxes</button>
    <button class="ghost sm" onclick={copyLastWeek}>Copy last week</button>
    <button class="ghost sm" onclick={() => go('faye')}>{CHILD_NAME}</button>
  </div>

  {#each days as d (d)}
    <div class="day" class:today={d === today}>
      <p class="eyebrow" style="margin:0 0 4px">{dayName(d)}{d === today ? ' · today' : ''}</p>
      <div class="card" style="padding:0 12px">
        {#each SLOTS.filter((s) => slotsForDay(d).includes(s.slot)) as s (s.slot)}
          {@const ms = slotAt(planState.slots, d, s.slot)}
          <button class="slot" class:box={s.slot === 'school_snackbox'} class:done={ms?.status === 'cooked'} class:skipped={ms?.status === 'skipped'} onclick={() => (open = { date: d, slot: s.slot })}>
            <span class="lbl">{s.label}</span>
            <span class="txt">{text(ms) || '+'}</span>
            {#if ms?.status === 'cooked'}<span class="pill">✓</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

{#if open}
  {#if open.slot === 'school_snackbox'}
    <SnackBoxSheet date={open.date} existing={openSlot} onclose={() => (open = null)} />
  {:else}
    <SlotSheet date={open.date} slot={open.slot} existing={openSlot} onclose={() => (open = null)} />
  {/if}
{/if}

<style>
  .sm { padding: 7px 11px; font-size: 13px; }
  .day { margin-bottom: 14px; }
  .day.today .eyebrow { color: var(--moss); }
  .slot { display: grid; grid-template-columns: 86px 1fr auto; align-items: center; gap: 8px; width: 100%; text-align: left;
    background: none; color: var(--ink); border-radius: 0; padding: 9px 0; border-bottom: 1px solid var(--rule-soft); font-weight: 400; }
  .slot:last-child { border-bottom: 0; }
  .lbl { font: 500 11px/1 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }
  .box .lbl { color: var(--ochre); }
  .txt { font-size: 14.5px; }
  .done .txt, .skipped .txt { color: var(--muted); }
  .skipped .txt { text-decoration: line-through; }
</style>
