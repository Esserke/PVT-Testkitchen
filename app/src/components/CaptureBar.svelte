<script lang="ts">
  // Camera entry points. Each opens the phone camera, shrinks the photo, and sends it to the reader.
  import { parse, shrinkImage, aiAvailable, type Kind, type Result, type Mode } from '../lib/ai'
  import { LOCATIONS, CHILD_NAME } from '../lib/constants'
  import { showToast } from '../lib/toast.svelte'
  import { refreshAiUsage } from '../lib/aiUsage.svelte'
  import ProposalSheet from './ProposalSheet.svelte'

  let kind = $state<Kind | null>(null)
  let location = $state<string>('fridge')
  let askLocation = $state(false)
  let boxMode = $state<Mode>('packed')
  let busy = $state<string | null>(null)
  let proposal = $state<{ kind: Kind; result: Result } | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)

  function start(k: Kind, m?: Mode) {
    if (!aiAvailable()) return showToast('Photo reading needs the online version of the app.')
    kind = k
    if (m) boxMode = m
    if (k === 'shelf_photo') askLocation = true
    else fileInput?.click()
  }
  function confirmLocation() {
    askLocation = false
    fileInput?.click()
  }
  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    ;(e.currentTarget as HTMLInputElement).value = ''
    if (!file || !kind) return
    busy = kind === 'shelf_photo' ? 'Counting the shelf' : kind === 'receipt' ? 'Reading the slip' : kind === 'lunchbox' ? 'Looking in the box' : kind === 'child_plate' ? `Looking at ${CHILD_NAME}'s plate` : 'Looking at the plate'
    try {
      const image = await shrinkImage(file)
      const result = await parse(kind, { image, location: kind === 'shelf_photo' ? location : undefined, mode: kind === 'lunchbox' || kind === 'child_plate' ? boxMode : undefined })
      proposal = { kind, result }
      void refreshAiUsage()
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), null, 8000)
    } finally {
      busy = null
    }
  }
</script>

<input bind:this={fileInput} type="file" accept="image/*" capture="environment" onchange={onFile} hidden />

<p class="eyebrow" style="margin:0 0 6px">House</p>
<div class="bar three">
  <button class="ghost" onclick={() => start('shelf_photo')} disabled={!!busy}>📷 Stock take</button>
  <button class="ghost" onclick={() => start('receipt')} disabled={!!busy}>🧾 Till slip</button>
  <button class="ghost" onclick={() => start('plate')} disabled={!!busy}>🍽 Our plate</button>
</div>
<p class="eyebrow" style="margin:10px 0 6px">{CHILD_NAME}</p>
<div class="bar">
  <button class="ghost" onclick={() => start('lunchbox', 'packed')} disabled={!!busy}>🧃 Box packed</button>
  <button class="ghost" onclick={() => start('lunchbox', 'home')} disabled={!!busy}>🏠 Box home</button>
  <button class="ghost" onclick={() => start('child_plate', 'before')} disabled={!!busy}>🍽 Plate before</button>
  <button class="ghost" onclick={() => start('child_plate', 'after')} disabled={!!busy}>✨ Plate after</button>
</div>
{#if busy}<p class="muted" style="font-size:13px;margin:6px 0 0">{busy}…</p>{/if}

{#if askLocation}
  <div class="scrim" onclick={() => (askLocation = false)} role="presentation"></div>
  <div class="sheet" role="dialog" aria-label="Which shelf">
    <h2 style="margin-bottom:8px">Which shelf?</h2>
    <div class="chips">
      {#each LOCATIONS as l (l)}<button class="ghost chip" class:on={location === l} onclick={() => (location = l)}>{l}</button>{/each}
    </div>
    <div class="row" style="margin-top:14px"><button onclick={confirmLocation}>Open camera</button><button class="ghost" onclick={() => (askLocation = false)}>Cancel</button></div>
  </div>
{/if}

{#if proposal}
  <ProposalSheet kind={proposal.kind} result={proposal.result} location={proposal.kind === 'shelf_photo' ? location : null} mode={boxMode} onclose={() => (proposal = null)} />
{/if}

<style>
  .bar { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .bar.three { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 480px) { .bar { grid-template-columns: repeat(4, 1fr); } }
  .bar button { padding: 9px 6px; font-size: 13.5px; }
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface); border-radius: 16px 16px 0 0; padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 7px 11px; font-size: 13.5px; }
  .chip.on { background: var(--moss); color: #fff; border-color: var(--moss); }
</style>
