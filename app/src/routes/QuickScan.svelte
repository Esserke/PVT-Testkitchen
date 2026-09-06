<script lang="ts">
  // Landing screen for a scanned shelf label: the item's quick actions, nothing else.
  import { route, go } from '../lib/router.svelte'
  import { stockState, stockMap } from '../lib/stockState.svelte'
  import { formatStock } from '../lib/domain/stock'
  import QuickSheet from '../components/QuickSheet.svelte'
  import StatusPill from '../components/StatusPill.svelte'

  const item = $derived(stockState.items.find((i) => i.id === route.param) ?? null)
  const stock = $derived(item ? stockMap([item], stockState.events).get(item.id) : undefined)
  let open = $state(true)
</script>

<div class="page">
  {#if !stockState.ready}
    <div class="empty">Loading</div>
  {:else if !item}
    <div class="empty">
      <p>That label points at an item this household does not have.</p>
      <button class="ghost" onclick={() => go('stock')}>Open stock</button>
    </div>
  {:else}
    <div class="card">
      <p class="eyebrow">{item.location}</p>
      <h2 style="margin-bottom:6px">{item.name}</h2>
      <div class="row"><StatusPill status={stock?.status ?? 'unknown'} /><span class="mono">{formatStock(item, stock?.stock ?? null)}</span></div>
      <div class="row" style="margin-top:12px">
        <button onclick={() => (open = true)}>Update</button>
        <button class="ghost" onclick={() => go('item', item.id)}>Full details</button>
        <button class="ghost" onclick={() => go('today')}>Done</button>
      </div>
    </div>
  {/if}
</div>

{#if open && item}
  <QuickSheet {item} {stock} onclose={() => (open = false)} />
{/if}
