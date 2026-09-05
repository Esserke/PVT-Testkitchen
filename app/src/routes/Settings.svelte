<script lang="ts">
  import { supabase, isLocalOnly } from '../lib/supabase'
  import { auth, signOut } from '../lib/auth.svelte'
  import { household, leaveDevice, leaveHousehold } from '../lib/household.svelte'
  import { sync, runSync, resetCursors } from '../lib/db/sync.svelte'

  async function resync() {
    await resetCursors()
    await runSync()
  }
  async function out() {
    await leaveDevice()
    await signOut()
  }
</script>

<div class="page">
  <div class="card" style="margin-bottom:12px">
    <p class="eyebrow">Household</p>
    <p><b>{household.name}</b>{#if household.memberName} · signed in as {household.memberName}{/if}</p>
    {#if household.inviteCode}
      <p>Invite code for the other phone: <span class="mono" style="font-size:18px">{household.inviteCode}</span></p>
    {/if}
    {#if isLocalOnly}
      <p class="muted">Running on this device only. Set the Supabase keys in the build to sync between phones.</p>
    {:else}
      <p class="muted" style="font-size:13px">Joined the wrong household? Switch to another with its invite code. A household left empty is removed.</p>
      <button class="ghost" onclick={leaveHousehold}>Switch household</button>
      {#if household.error}<p style="color:var(--danger)">{household.error}</p>{/if}
    {/if}
  </div>

  <div class="card" style="margin-bottom:12px">
    <p class="eyebrow">Sync</p>
    <p>Status: <b>{sync.status}</b>{#if sync.pending} · {sync.pending} change{sync.pending === 1 ? '' : 's'} waiting{/if}</p>
    {#if sync.lastSync}<p class="muted">Last synced {new Date(sync.lastSync).toLocaleTimeString()}</p>{/if}
    {#if sync.error}<p style="color:var(--danger)">{sync.error}</p>{/if}
    {#if supabase}
      <div class="row">
        <button onclick={runSync}>Sync now</button>
        <button class="ghost" onclick={resync}>Full re-pull</button>
      </div>
    {/if}
  </div>

  {#if supabase && auth.session}
    <div class="card">
      <p class="eyebrow">Account</p>
      <p class="muted">{auth.session.user.email}</p>
      <button class="danger" onclick={out}>Sign out and clear this device</button>
    </div>
  {/if}
</div>
