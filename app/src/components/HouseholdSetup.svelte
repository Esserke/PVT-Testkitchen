<script lang="ts">
  import { household, createHousehold, joinHousehold } from '../lib/household.svelte'
  import { signOut } from '../lib/auth.svelte'
  let mode = $state<'create' | 'join'>('create')
  let name = $state('Our house')
  let me = $state('')
  let code = $state('')
  let busy = $state(false)

  async function submit(e: Event) {
    e.preventDefault()
    busy = true
    if (mode === 'create') await createHousehold(name.trim(), me.trim())
    else await joinHousehold(code, me.trim())
    busy = false
  }
</script>

<div class="page">
  <p class="eyebrow">Larder</p>
  <h1>Your household</h1>
  <p class="muted">The first person creates it. The second joins with the invite code shown in Settings.</p>
  <div class="row" style="margin-bottom:12px">
    <button class:ghost={mode !== 'create'} onclick={() => (mode = 'create')}>Create</button>
    <button class:ghost={mode !== 'join'} onclick={() => (mode = 'join')}>Join</button>
  </div>
  <form onsubmit={submit} class="card">
    <div class="field">
      <label for="me">Your name</label>
      <input id="me" bind:value={me} required />
    </div>
    {#if mode === 'create'}
      <div class="field">
        <label for="name">Household name</label>
        <input id="name" bind:value={name} required />
      </div>
    {:else}
      <div class="field">
        <label for="code">Invite code</label>
        <input id="code" bind:value={code} required class="mono" autocapitalize="off" />
      </div>
    {/if}
    {#if household.error}<p style="color:var(--danger)">{household.error}</p>{/if}
    <button type="submit" disabled={busy || !me}>{mode === 'create' ? 'Create household' : 'Join household'}</button>
  </form>
  <p style="margin-top:16px"><button class="ghost" onclick={signOut}>Sign out</button></p>
</div>
