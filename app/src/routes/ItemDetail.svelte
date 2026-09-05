<script lang="ts">
  import { route, back, go } from '../lib/router.svelte'
  import { stockState, stockMap, eventsByItem } from '../lib/stockState.svelte'
  import { formatStock } from '../lib/domain/stock'
  import { LOCATIONS, CATEGORIES, UNITS, SHOPS } from '../lib/constants'
  import { saveItem, undoEvent } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'
  import QuickSheet from '../components/QuickSheet.svelte'
  import StatusPill from '../components/StatusPill.svelte'
  import type { Item } from '../lib/db/types'

  const item = $derived(stockState.items.find((i) => i.id === route.param) ?? null)
  const stock = $derived(item ? stockMap([item], stockState.events).get(item.id) : undefined)
  const history = $derived(
    item ? (eventsByItem(stockState.events).get(item.id) ?? []).filter((e) => !e.deleted).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30) : [],
  )

  let draft = $state<Item | null>(null)
  let aliasText = $state('')
  let sheet = $state(false)
  $effect(() => {
    if (item && (!draft || draft.id !== item.id)) {
      draft = { ...item }
      aliasText = item.aliases.join(', ')
    }
  })

  async function save(e: Event) {
    e.preventDefault()
    if (!draft) return
    await saveItem({
      ...draft,
      name: draft.name.trim(),
      aliases: aliasText.split(',').map((a) => a.trim()).filter(Boolean),
      pack_size: Number(draft.pack_size) || 1,
      par_level: draft.par_level === null || draft.par_level === ('' as unknown) ? null : Number(draft.par_level),
    })
    showToast('Saved')
    back()
  }
  async function archive() {
    if (!item) return
    await saveItem({ ...item, archived: true })
    showToast(`${item.name} archived`, async () => { await saveItem({ ...item, archived: false }) })
    go('stock')
  }
  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<div class="page">
  {#if !item || !draft}
    <div class="empty">Item not found. <button class="ghost" onclick={() => go('stock')}>Back to stock</button></div>
  {:else}
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <button class="ghost" onclick={back}>Back</button>
      <div class="row">
        <StatusPill status={stock?.status ?? 'unknown'} />
        <span class="mono">{formatStock(item, stock?.stock ?? null)}</span>
        <button onclick={() => (sheet = true)}>Update</button>
      </div>
    </div>

    <form class="card" onsubmit={save} style="margin-bottom:16px">
      <div class="field"><label for="name">Name</label><input id="name" bind:value={draft.name} required /></div>
      <div class="field"><label for="al">Also called (comma separated)</label><input id="al" bind:value={aliasText} placeholder="loo roll, toilet rolls" /></div>
      <div class="row">
        <div class="field" style="flex:1"><label for="loc">Where</label>
          <select id="loc" bind:value={draft.location}>{#each LOCATIONS as l}<option value={l}>{l}</option>{/each}</select></div>
        <div class="field" style="flex:1"><label for="cat">Category</label>
          <select id="cat" bind:value={draft.category}>{#each CATEGORIES as c}<option value={c}>{c}</option>{/each}</select></div>
      </div>
      <div class="row">
        <div class="field" style="flex:1"><label for="unit">Unit</label>
          <select id="unit" bind:value={draft.unit}>{#each UNITS as u}<option value={u}>{u}</option>{/each}</select></div>
        <div class="field" style="flex:1"><label for="pack">Units per pack</label>
          <input id="pack" type="number" min="0.01" step="any" inputmode="decimal" bind:value={draft.pack_size} /></div>
        <div class="field" style="flex:1"><label for="par">Keep at least</label>
          <input id="par" type="number" min="0" step="any" inputmode="decimal" bind:value={draft.par_level} /></div>
      </div>
      <div class="row">
        <div class="field" style="flex:1"><label for="mode">Track by</label>
          <select id="mode" bind:value={draft.tracking_mode}>
            <option value="count">count</option><option value="level">level (full/half/low/out)</option><option value="cycle">cycle (purchases only)</option>
          </select></div>
        <div class="field" style="flex:1"><label for="shop">Usually from</label>
          <select id="shop" bind:value={draft.preferred_shop}>
            <option value={null}>Anywhere</option>{#each SHOPS as s}<option value={s}>{s}</option>{/each}
          </select></div>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:14px;margin:4px 0 12px">
        <label class="row" style="margin:0"><input type="checkbox" checked={draft.source === 'farm'} onchange={(e) => (draft!.source = (e.currentTarget as HTMLInputElement).checked ? 'farm' : 'bought')} style="width:auto" /> From the farm</label>
        <label class="row" style="margin:0"><input type="checkbox" bind:checked={draft.snackbox_ok} style="width:auto" /> Snack box</label>
        <label class="row" style="margin:0"><input type="checkbox" bind:checked={draft.kid_ok} style="width:auto" /> Kid ok</label>
      </div>
      <div class="row" style="justify-content:space-between">
        <button type="submit">Save</button>
        <button type="button" class="ghost" onclick={archive}>Archive</button>
      </div>
    </form>

    <p class="eyebrow" style="margin-bottom:6px">History</p>
    {#if history.length === 0}
      <div class="empty">No events yet. Tap Update to count what is there.</div>
    {:else}
      <div class="card" style="padding:0 12px">
        {#each history as e, idx (e.id)}
          <div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--rule-soft);font-size:14px">
            <span><b>{e.type}</b>{e.type !== 'finished' ? ` ${e.quantity}` : ''}{e.price_zar != null ? ` · R${e.price_zar}` : ''}</span>
            <span class="row">
              <span class="muted mono" style="font-size:12.5px">{when(e.at)}</span>
              {#if idx === 0}<button class="ghost" style="padding:4px 8px;font-size:12.5px" onclick={() => undoEvent(e.id)}>Undo</button>{/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#if sheet && item}
  <QuickSheet {item} {stock} onclose={() => (sheet = false)} />
{/if}
