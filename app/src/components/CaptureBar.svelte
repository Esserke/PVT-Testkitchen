<script lang="ts">
  // Camera entry points. Each opens the phone camera, shrinks the photo, and sends it to the reader.
  import { parse, shrinkImage, aiAvailable, type Kind, type Result } from '../lib/ai'
  import { LOCATIONS, CHILD_NAME } from '../lib/constants'
  import { showToast } from '../lib/toast.svelte'
  import { refreshAiUsage } from '../lib/aiUsage.svelte'
  import ProposalSheet from './ProposalSheet.svelte'

  let kind = $state<Kind | null>(null)
  let location = $state<string>('fridge')
  let askLocation = $state(false)
  let askBox = $state(false)
  let boxMode = $state<'packed' | 'home'>('packed')
  let busy = $state<string | null>(null)
  let proposal = $state<{ kind: Kind; result: Result } | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)

  function start(k: Kind) {
    if (!aiAvailable()) return showToast('Photo reading needs the online version of the app.')
    kind = k
    if (k === 'shelf_photo') askLocation = true
    else if (k === 'lunchbox') askBox = true
    else fileInput?.click()
  }
  function confirmBox(m: 'packed' | 'home') {
    boxMode = m
    askBox = false
    fileInput?.click()
  }
  function confirmLocation() {
    askLocation = false
    fileInput?.click()
  }
  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    ;(e.currentTarget as HTMLInputElement).value = ''
    if (!file || !kind) return
    busy = kind === 'shelf_photo' ? 'Reading the shelf' : kind === 'receipt' ? 'Reading the slip' : kind === 'lunchbox' ? 'Looking in the box' : 'Looking at the plate'
    try {
      const image = await shrinkImage(file)
      const result = await parse(kind, { image, location: kind === 'shelf_photo' ? location : undefined, mode: kind === 'lunchbox' ? boxMode : undefined })
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

<div class="bar">
  <button class="ghost" onclick={() => start('shelf_photo')} disabled={!!busy}>📷 Shelf</button>
  <button class="ghost" onclick={() => start('receipt')} disabled={!!busy}>🧾 Till slip</button>
  <button class="ghost" onclick={() => start('plate')} disabled={!!busy}>🍽 Plate</button>
  <button class="ghost" onclick={() => start('lunchbox')} disabled={!!busy}>🧃 {CHILD_NAME}'s box</button>
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

{#if askBox}
  <div class="scrim" onclick={() => (askBox = false)} role="presentation"></div>
  <div class="sheet" role="dialog" aria-label="Snack box photo">
    <h2 style="margin-bottom:8px">{CHILD_NAME}'s box</h2>
    <p class="muted" style="font-size:13.5px">Packing it now fills in today's box. Coming home records what she ate.</p>
    <div class="row"><button onclick={() => confirmBox('packed')}>Packing it</button><button class="ghost" onclick={() => confirmBox('home')}>It came home</button></div>
  </div>
{/if}

{#if proposal}
  <ProposalSheet kind={proposal.kind} result={proposal.result} location={proposal.kind === 'shelf_photo' ? location : null} mode={boxMode} onclose={() => (proposal = null)} />
{/if}

<style>
  .bar { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  @media (min-width: 480px) { .bar { grid-template-columns: repeat(4, 1fr); } }
  .bar button { padding: 9px 6px; font-size: 13.5px; }
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface); border-radius: 16px 16px 0 0; padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 7px 11px; font-size: 13.5px; }
  .chip.on { background: var(--moss); color: #fff; border-color: var(--moss); }
</style>
