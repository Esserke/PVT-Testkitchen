<script lang="ts">
  import { liveQuery } from 'dexie'
  import { db } from '../lib/db/schema'
  import { household } from '../lib/household.svelte'
  import { go } from '../lib/router.svelte'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { formatStock } from '../lib/domain/stock'
  import { forecastMap } from '../lib/forecastState.svelte'
  import { describe as describeForecast } from '../lib/domain/forecast'
  import { markFinished, undoEvent, captureText, saveCapture } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'
  import QuickSheet from '../components/QuickSheet.svelte'
  import CaptureBar from '../components/CaptureBar.svelte'
  import ProposalSheet from '../components/ProposalSheet.svelte'
  import { parse, aiAvailable, type MessageResult } from '../lib/ai'
  import { refreshAiUsage } from '../lib/aiUsage.svelte'
  import type { Capture, Item } from '../lib/db/types'
  import { planState, slotAt } from '../lib/planState.svelte'
  import { SLOTS, toIsoDate, slotsForDay } from '../lib/domain/plan'
  import { CHILD_NAME } from '../lib/constants'

  const todayIso = toIsoDate(new Date())
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const recipesById = $derived(new Map(planState.recipes.map((r) => [r.id, r])))
  const meals = $derived(
    SLOTS.filter((s) => slotsForDay(todayIso).includes(s.slot)).map((s) => {
      const ms = slotAt(planState.slots, todayIso, s.slot)
      const txt = !ms ? '' : ms.recipe_id ? recipesById.get(ms.recipe_id)?.title ?? '?' : ms.free_text ?? ms.item_ids.map((id) => itemsById.get(id)?.name ?? '?').join(', ')
      return { ...s, txt, done: ms?.status === 'cooked' }
    }),
  )

  const stock = $derived(stockMap(stockState.items, stockState.events))
  const active = $derived(stockState.items.filter((i) => !i.archived))

  // The 20 items we touch most; until there is history, the ones with a par level.
  const grid = $derived.by(() => {
    return active
      .filter((i) => i.tracking_mode !== 'cycle')
      .map((i) => ({ item: i, s: stock.get(i.id) }))
      .sort((a, b) => (b.s?.touches ?? 0) - (a.s?.touches ?? 0) || (b.item.par_level ?? 0) - (a.item.par_level ?? 0) || a.item.name.localeCompare(b.item.name))
      .slice(0, 20)
  })
  // Low or out now, plus anything forecast to run out within two weeks, soonest first.
  const forecasts = $derived(forecastMap())
  const runningOut = $derived(
    active
      .map((i) => ({ item: i, s: stock.get(i.id), f: forecasts.get(i.id) }))
      .filter(({ s, f }) => (s && (s.status === 'out' || s.status === 'low')) || (f && f.daysLeft !== null && f.daysLeft <= 14 && f.confidence !== 'none'))
      .sort((a, b) => (a.f?.daysLeft ?? (a.s?.status === 'out' ? 0 : 7)) - (b.f?.daysLeft ?? (b.s?.status === 'out' ? 0 : 7)))
      .slice(0, 8),
  )

  let sheetItem = $state<Item | null>(null)
  async function finished(item: Item) {
    const ev = await markFinished(item)
    showToast(`${item.name} finished`, () => undoEvent(ev.id))
  }

  let text = $state('')
  let pending = $state<Capture[]>([])
  $effect(() => {
    const id = household.id
    if (!id) return
    const sub = liveQuery(() =>
      db.capture.where('household_id').equals(id).filter((c) => !c.deleted && c.status === 'pending').reverse().sortBy('created_at'),
    ).subscribe((rows) => (pending = rows))
    return () => sub.unsubscribe()
  })
  async function capture(e: Event) {
    e.preventDefault()
    if (!text.trim()) return
    await captureText(text.trim())
    text = ''
    showToast('Noted. It is in the inbox until we read it.')
  }
  const dismiss = (c: Capture) => saveCapture({ ...c, status: 'dismissed' })
  let reading = $state<string | null>(null)
  let noteProposal = $state<{ capture: Capture; result: MessageResult } | null>(null)
  async function readNote(c: Capture) {
    if (!aiAvailable()) return showToast('Reading notes needs the online version of the app.')
    reading = c.id
    try {
      const result = await parse<MessageResult>('message', { text: c.raw_text ?? '' })
      noteProposal = { capture: c, result }
      void refreshAiUsage()
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), null, 8000)
    } finally {
      reading = null
    }
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
</script>

<div class="page">
  <p class="eyebrow">{today}</p>

  <form onsubmit={capture} class="row" style="margin:10px 0 10px">
    <input bind:value={text} placeholder="Milk finished, low on rusks…" aria-label="Quick note" />
    <button type="submit" disabled={!text.trim()}>Note</button>
  </form>
  <div style="margin-bottom:18px"><CaptureBar /></div>

  {#if pending.length}
    <p class="eyebrow" style="margin-bottom:6px">Inbox · {pending.length}</p>
    <div class="list" style="margin-bottom:18px">
      {#each pending as c (c.id)}
        <div class="card row" style="padding:10px 12px">
          <div style="flex:1">{c.raw_text}</div>
          <button onclick={() => readNote(c)} disabled={reading === c.id}>{reading === c.id ? 'Reading' : 'Read'}</button>
          <button class="ghost" onclick={() => dismiss(c)}>Done</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="row" style="justify-content:space-between;margin-bottom:6px">
    <p class="eyebrow" style="margin:0">Today's meals</p>
    <button class="ghost" style="padding:6px 10px;font-size:13px" onclick={() => go('plan')}>Plan</button>
  </div>
  <div class="card" style="padding:4px 12px;margin-bottom:18px">
    {#each meals as m (m.slot)}
      <div class="row meal" class:box={m.slot === 'school_snackbox'}>
        <span class="lbl">{m.slot === 'school_snackbox' ? `${CHILD_NAME}'s box` : m.label}</span>
        <span style="flex:1" class:muted={!m.txt || m.done}>{m.txt || '—'}</span>
        {#if m.done}<span class="pill">✓</span>{/if}
      </div>
    {/each}
  </div>

  {#if runningOut.length}
    <div class="row" style="justify-content:space-between;margin-bottom:6px">
      <p class="eyebrow" style="margin:0">Running out</p>
      <span class="row">
        <button class="ghost" style="padding:6px 10px;font-size:13px" onclick={() => go('insights')}>Insights</button>
        <button class="ghost" style="padding:6px 10px;font-size:13px" onclick={() => go('shop')}>Open list</button>
      </span>
    </div>
    <div class="card" style="padding:6px 12px;margin-bottom:18px">
      {#each runningOut as { item, s, f } (item.id)}
        <div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--rule-soft)">
          <button class="link" onclick={() => go('item', item.id)}>{item.name}</button>
          <span class="muted" style="font-size:13px">{f && f.method !== 'none' ? describeForecast(f, item) : formatStock(item, s?.stock ?? null)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if !runningOut.length}
    <p style="text-align:right;margin:-6px 0 8px"><button class="ghost" style="padding:6px 10px;font-size:13px" onclick={() => go('insights')}>Insights</button></p>
  {/if}
  <p class="eyebrow" style="margin-bottom:6px">Tap when finished</p>
  {#if !stockState.ready}
    <div class="empty">Loading</div>
  {:else if grid.length === 0}
    <div class="empty">Add items under Stock and they appear here.</div>
  {:else}
    <div class="grid">
      {#each grid as { item, s } (item.id)}
        <div class="tile" class:out={s?.status === 'out'} class:low={s?.status === 'low'}>
          <button class="main" onclick={() => finished(item)}>
            <span class="name">{item.name}</span>
            <span class="qty mono">{formatStock(item, s?.stock ?? null)}</span>
          </button>
          <button class="more" onclick={() => (sheetItem = item)} aria-label="More for {item.name}">···</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if sheetItem}
  <QuickSheet item={sheetItem} stock={stock.get(sheetItem.id)} onclose={() => (sheetItem = null)} />
{/if}
{#if noteProposal}
  <ProposalSheet kind="message" result={noteProposal.result} onclose={() => (noteProposal = null)} ondone={() => noteProposal && saveCapture({ ...noteProposal.capture, status: 'confirmed' })} />
{/if}

<style>
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  @media (min-width: 480px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  .tile { display: grid; grid-template-columns: 1fr auto; background: var(--surface); border: 1px solid var(--rule-soft); border-radius: 10px; overflow: hidden; }
  .tile.low { border-color: var(--ochre); }
  .tile.out { border-color: var(--danger); }
  .main { background: none; color: var(--ink); text-align: left; padding: 12px 10px; border-radius: 0; display: flex; flex-direction: column; gap: 4px; min-height: 64px; }
  .name { font-weight: 500; font-size: 14.5px; line-height: 1.25; }
  .qty { font-size: 12px; color: var(--muted); }
  .more { background: none; color: var(--muted); border-left: 1px solid var(--rule-soft); border-radius: 0; padding: 0 10px; font-size: 14px; }
  .link { background: none; color: var(--ink); padding: 0; text-align: left; font-weight: 400; }
  .meal { padding: 7px 0; border-bottom: 1px solid var(--rule-soft); font-size: 14.5px; }
  .meal:last-child { border-bottom: 0; }
  .lbl { font: 500 11px/1 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); width: 84px; }
  .box .lbl { color: var(--ochre); }
</style>
