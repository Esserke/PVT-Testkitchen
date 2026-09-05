<script lang="ts">
  import { liveQuery } from 'dexie'
  import { db } from '../lib/db/schema'
  import { household } from '../lib/household.svelte'
  import { go } from '../lib/router.svelte'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { formatStock } from '../lib/domain/stock'
  import { markFinished, undoEvent, captureText, saveCapture } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'
  import QuickSheet from '../components/QuickSheet.svelte'
  import type { Capture, Item } from '../lib/db/types'

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
  const runningOut = $derived(
    active.map((i) => ({ item: i, s: stock.get(i.id) })).filter(({ s }) => s && (s.status === 'out' || s.status === 'low')).slice(0, 8),
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

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
</script>

<div class="page">
  <p class="eyebrow">{today}</p>

  <form onsubmit={capture} class="row" style="margin:10px 0 18px">
    <input bind:value={text} placeholder="Milk finished, low on rusks…" aria-label="Quick note" />
    <button type="submit" disabled={!text.trim()}>Note</button>
  </form>

  {#if pending.length}
    <p class="eyebrow" style="margin-bottom:6px">Inbox · {pending.length}</p>
    <div class="list" style="margin-bottom:18px">
      {#each pending as c (c.id)}
        <div class="card row" style="padding:10px 12px">
          <div style="flex:1">{c.raw_text}</div>
          <button class="ghost" onclick={() => dismiss(c)}>Done</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if runningOut.length}
    <div class="row" style="justify-content:space-between;margin-bottom:6px">
      <p class="eyebrow" style="margin:0">Running out</p>
      <button class="ghost" style="padding:6px 10px;font-size:13px" onclick={() => go('shop')}>Open list</button>
    </div>
    <div class="card" style="padding:6px 12px;margin-bottom:18px">
      {#each runningOut as { item, s } (item.id)}
        <div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--rule-soft)">
          <button class="link" onclick={() => go('item', item.id)}>{item.name}</button>
          <span class="mono muted" style="font-size:13px">{formatStock(item, s?.stock ?? null)}</span>
        </div>
      {/each}
    </div>
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
</style>
