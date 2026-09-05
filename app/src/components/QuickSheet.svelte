<script lang="ts">
  import type { Item } from '../lib/db/types'
  import type { ItemStock } from '../lib/domain/stock'
  import { LEVELS, formatStock } from '../lib/domain/stock'
  import { markFinished, setCount, setLevel, useOne, bought, produced, undoEvent } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'

  let { item, stock, onclose }: { item: Item; stock: ItemStock | undefined; onclose: () => void } = $props()
  let count = $state<number | null>(null)
  $effect(() => {
    count = item.tracking_mode === 'count' ? (stock?.stock ?? null) : null
  })

  async function done(label: string, p: Promise<{ id: string }>) {
    const ev = await p
    showToast(label, () => undoEvent(ev.id))
    onclose()
  }
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-label="Update {item.name}">
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <div>
      <h2>{item.name}</h2>
      <div class="muted" style="font-size:13px">{item.location} · now {formatStock(item, stock?.stock ?? null)}</div>
    </div>
    <button class="ghost" onclick={onclose} aria-label="Close">Close</button>
  </div>

  {#if item.tracking_mode === 'level'}
    <p class="eyebrow" style="margin:10px 0 6px">Set level</p>
    <div class="grid4">
      {#each LEVELS as l (l.value)}
        <button class:ghost={l.value !== 0} onclick={() => done(`${item.name}: ${l.label}`, setLevel(item, l.value))}>{l.label}</button>
      {/each}
    </div>
  {:else if item.tracking_mode === 'count'}
    <div class="grid2" style="margin-bottom:10px">
      <button class="danger" onclick={() => done(`${item.name} finished`, markFinished(item))}>Finished</button>
      <button class="ghost" onclick={() => done(`Used 1 ${item.unit} of ${item.name}`, useOne(item))}>Used 1 {item.unit}</button>
    </div>
    <p class="eyebrow" style="margin:6px 0">Count what is there</p>
    <div class="row">
      <input type="number" min="0" step="any" inputmode="decimal" bind:value={count} aria-label="Count" />
      <button disabled={count === null} onclick={() => done(`${item.name}: ${count} ${item.unit}`, setCount(item, count ?? 0))}>Set</button>
    </div>
  {:else}
    <p class="muted">Cycle item. Record purchases and the tool will learn the rhythm.</p>
  {/if}

  <p class="eyebrow" style="margin:14px 0 6px">Came in</p>
  <div class="grid2">
    {#if item.source === 'farm'}
      <button class="ghost" onclick={() => done(`${item.pack_size} ${item.unit} of ${item.name} collected`, produced(item, item.pack_size || 1))}>Collected {item.pack_size || 1} {item.unit}</button>
    {/if}
    <button class="ghost" onclick={() => done(`Bought 1 pack of ${item.name}`, bought(item, 1, null, 'tap'))}>Bought 1 pack{item.pack_size > 1 ? ` (${item.pack_size} ${item.unit})` : ''}</button>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface);
    border-radius: 16px 16px 0 0; padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
    max-width: 640px; margin: 0 auto; box-shadow: 0 -8px 30px rgb(0 0 0 / .15);
  }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
</style>
