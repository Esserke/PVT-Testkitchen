<script lang="ts">
  import { auth, sendMagicLink } from '../lib/auth.svelte'
  let email = $state('')
  let sent = $state(false)
  let busy = $state(false)

  async function submit(e: Event) {
    e.preventDefault()
    busy = true
    sent = await sendMagicLink(email.trim())
    busy = false
  }
</script>

<div class="page">
  <p class="eyebrow">Larder</p>
  <h1>Sign in</h1>
  <p class="muted">We email you a link. No password to remember.</p>
  {#if sent}
    <div class="card">
      <p><b>Check your email.</b> Open the link on this phone and you will land back here, signed in.</p>
      <button class="ghost" onclick={() => (sent = false)}>Use a different address</button>
    </div>
  {:else}
    <form onsubmit={submit} class="card">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required autocomplete="email" inputmode="email" />
      </div>
      {#if auth.error}<p style="color:var(--danger)">{auth.error}</p>{/if}
      <button type="submit" disabled={busy || !email}>Send sign-in link</button>
    </form>
  {/if}
</div>
