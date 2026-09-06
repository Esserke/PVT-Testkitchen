<script lang="ts">
  // Printable QR labels. Scanning one with the phone camera opens that item's quick actions.
  import QRCode from 'qrcode'
  import { stockState } from '../lib/stockState.svelte'
  import { LOCATIONS } from '../lib/constants'
  import { back } from '../lib/router.svelte'
  import type { Item } from '../lib/db/types'

  const base = window.location.origin + window.location.pathname
  let chosen = $state<Set<string>>(new Set())
  let filter = $state<string>('all')
  let codes = $state<Map<string, string>>(new Map())

  const items = $derived(stockState.items.filter((i) => !i.archived && (filter === 'all' || i.location === filter)).sort((a, b) => a.name.localeCompare(b.name)))
  const selected = $derived(stockState.items.filter((i) => chosen.has(i.id)).sort((a, b) => a.location.localeCompare(b.location) || a.name.localeCompare(b.name)))

  function toggle(i: Item) {
    const next = new Set(chosen)
    if (next.has(i.id)) next.delete(i.id)
    else next.add(i.id)
    chosen = next
  }
  function selectAllShown() {
    const next = new Set(chosen)
    for (const i of items) next.add(i.id)
    chosen = next
  }
  const clear = () => (chosen = new Set())

  // Render each chosen item's QR once, as a data URL.
  $effect(() => {
    const missing = selected.filter((i) => !codes.has(i.id))
    if (!missing.length) return
    void Promise.all(
      missing.map(async (i) => [i.id, await QRCode.toDataURL(`${base}#/quick/${i.id}`, { margin: 0, width: 240, errorCorrectionLevel: 'M' })] as const),
    ).then((pairs) => {
      const next = new Map(codes)
      for (const [id, url] of pairs) next.set(id, url)
      codes = next
    })
  })
</script>

<div class="page noprint">
  <div class="row" style="justify-content:space-between;margin-bottom:12px">
    <button class="ghost" onclick={back}>Back</button>
    <button onclick={() => window.print()} disabled={!selected.length}>Print {selected.length || ''}</button>
  </div>
  <p class="eyebrow">Shelf labels</p>
  <p class="muted" style="font-size:13.5px">Stick a label on a shelf, a bin or a bottle. Point any phone camera at it and the app opens that item ready to tap finished, low or counted. Handy where nobody has the app open: the pool shed, the laundry, the store room.</p>

  <div class="row" style="flex-wrap:wrap;margin:12px 0">
    <select bind:value={filter} style="width:auto"><option value="all">Everywhere</option>{#each LOCATIONS as l}<option value={l}>{l}</option>{/each}</select>
    <button class="ghost" onclick={selectAllShown}>Select these</button>
    {#if chosen.size}<button class="ghost" onclick={clear}>Clear {chosen.size}</button>{/if}
  </div>

  <div class="list">
    {#each items as i (i.id)}
      <label class="pick"><input type="checkbox" checked={chosen.has(i.id)} onchange={() => toggle(i)} style="width:20px;height:20px" /><span style="flex:1">{i.name}</span><span class="muted" style="font-size:12.5px">{i.location}</span></label>
    {/each}
    {#if items.length === 0}<div class="empty">Nothing here.</div>{/if}
  </div>
</div>

{#if selected.length}
  <p class="eyebrow noprint" style="max-width:720px;margin:16px auto 6px;padding:0 16px">Preview · {selected.length} label{selected.length === 1 ? '' : 's'}</p>
  <div class="sheet">
    {#each selected as i (i.id)}
      <div class="label">
        {#if codes.get(i.id)}<img src={codes.get(i.id)} alt="" width="120" height="120" />{:else}<div class="ph"></div>{/if}
        <div class="txt">
          <b>{i.name}</b>
          <span>{i.location} · {i.unit}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .pick { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--rule-soft); margin: 0; color: var(--ink); }
  .sheet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-width: 720px; margin: 0 auto; padding: 0 16px 24px; }
  @media (min-width: 560px) { .sheet { grid-template-columns: repeat(3, 1fr); } }
  .label { display: flex; align-items: center; gap: 8px; border: 1px solid var(--rule); border-radius: 6px; padding: 6px; break-inside: avoid; background: #fff; color: #111; }
  .label img { width: 76px; height: 76px; }
  .ph { width: 76px; height: 76px; background: var(--rule-soft); border-radius: 4px; }
  .txt { display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.2; overflow: hidden; }
  .txt span { font-size: 11px; color: #555; }
  @media print {
    :global(body) { background: #fff; color: #000; padding: 0; }
    :global(header), :global(nav), .noprint { display: none !important; }
    .sheet { grid-template-columns: repeat(3, 1fr); gap: 4mm; padding: 8mm; max-width: none; }
    .label { border-color: #bbb; }
    .label img, .ph { width: 30mm; height: 30mm; }
    .txt { font-size: 10pt; }
    .txt span { font-size: 8pt; }
  }
</style>
