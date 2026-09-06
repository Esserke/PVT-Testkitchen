<script lang="ts">
  import { supabase, isLocalOnly } from '../lib/supabase'
  import { auth, signOut } from '../lib/auth.svelte'
  import { household, leaveDevice, leaveHousehold } from '../lib/household.svelte'
  import { sync, runSync, resetCursors, discardPending } from '../lib/db/sync.svelte'
  import { stockState } from '../lib/stockState.svelte'
  import { countDuplicates, mergeDuplicateItems } from '../lib/actions'
  import { showToast } from '../lib/toast.svelte'
  import { aiUsage, refreshAiUsage } from '../lib/aiUsage.svelte'
  import { childState } from '../lib/childState.svelte'
  import { setBudget } from '../lib/actions'
  import { CATEGORIES } from '../lib/constants'
  const totalBudget = $derived(childState.budgets.find((b) => b.category === 'all'))
  let budgetTotal = $state<number | null>(null)
  let budgetCat = $state<string>(CATEGORIES[0])
  let budgetCatAmount = $state<number | null>(null)
  $effect(() => {
    budgetTotal = totalBudget?.monthly_zar ?? null
  })
  async function saveTotal(e: Event) {
    e.preventDefault()
    if (budgetTotal === null) return
    await setBudget(totalBudget, 'all', Number(budgetTotal))
    showToast('Budget saved')
  }
  async function saveCat(e: Event) {
    e.preventDefault()
    if (budgetCatAmount === null) return
    await setBudget(childState.budgets.find((b) => b.category === budgetCat), budgetCat, Number(budgetCatAmount))
    budgetCatAmount = null
    showToast(`${budgetCat} budget saved`)
  }
  $effect(() => {
    void refreshAiUsage()
  })

  const duplicates = $derived(countDuplicates(stockState.items, stockState.events))
  let merging = $state(false)
  async function merge() {
    merging = true
    const n = await mergeDuplicateItems(stockState.items, stockState.events)
    merging = false
    showToast(n ? `${n} duplicate${n === 1 ? '' : 's'} merged` : 'No duplicates found')
  }

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

  {#if duplicates}
    <div class="card" style="margin-bottom:12px;border-color:var(--ochre)">
      <p class="eyebrow">Duplicates</p>
      <p>{duplicates} item{duplicates === 1 ? ' appears' : 's appear'} twice in Stock, usually because both phones loaded the starter catalogue. Merging keeps the copy with history and moves everything else onto it.</p>
      <button onclick={merge} disabled={merging}>{merging ? 'Merging' : `Merge ${duplicates} duplicate${duplicates === 1 ? '' : 's'}`}</button>
    </div>
  {/if}

  <div class="card" style="margin-bottom:12px">
    <p class="eyebrow">Sync</p>
    <p>Status: <b>{sync.status}</b>{#if sync.pending} · {sync.pending} change{sync.pending === 1 ? '' : 's'} waiting{/if}</p>
    {#if sync.lastSync}<p class="muted">Last synced {new Date(sync.lastSync).toLocaleTimeString()}</p>{/if}
    {#if sync.error}<p style="color:var(--danger)">{sync.error}</p>{/if}
    {#if sync.dropped}<p class="muted" style="font-size:13px">{sync.dropped} change{sync.dropped === 1 ? '' : 's'} could not be sent and {sync.dropped === 1 ? 'was' : 'were'} set aside. Usually these belong to a household this phone has left.</p>{/if}
    {#if supabase}
      <div class="row" style="flex-wrap:wrap">
        <button onclick={runSync}>Sync now</button>
        <button class="ghost" onclick={resync}>Full re-pull</button>
        {#if sync.pending}<button class="ghost" onclick={discardPending}>Discard {sync.pending} waiting</button>{/if}
      </div>
      {#if sync.pending}<p class="muted" style="font-size:12.5px;margin-top:8px">Discard only if changes stay stuck after reopening the app. Whatever is on this phone stays; it just stops trying to send it.</p>{/if}
    {/if}
  </div>

  <div class="card" style="margin-bottom:12px">
    <p class="eyebrow">Monthly budget</p>
    <form onsubmit={saveTotal} class="row" style="margin-bottom:8px">
      <label for="bt" style="margin:0;white-space:nowrap">Whole house R</label>
      <input id="bt" type="number" min="0" step="100" inputmode="numeric" bind:value={budgetTotal} placeholder="8000" />
      <button type="submit">Save</button>
    </form>
    <form onsubmit={saveCat} class="row" style="flex-wrap:wrap">
      <select bind:value={budgetCat} style="width:auto">{#each CATEGORIES as c}<option value={c}>{c}</option>{/each}</select>
      <input type="number" min="0" step="50" inputmode="numeric" bind:value={budgetCatAmount} placeholder="R per month" style="width:130px" />
      <button type="submit" class="ghost">Set</button>
    </form>
    {#if childState.budgets.filter((b) => b.category !== 'all').length}
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">{childState.budgets.filter((b) => b.category !== 'all').map((b) => `${b.category} R${b.monthly_zar}`).join(' · ')}</p>
    {/if}
  </div>

  {#if supabase}
    <div class="card" style="margin-bottom:12px">
      <p class="eyebrow">Reading photos and notes</p>
      {#if aiUsage.loaded}
        <p>Today: <b>{aiUsage.today}</b> of 60 reads. This month: {aiUsage.monthCalls} read{aiUsage.monthCalls === 1 ? '' : 's'}, about <b>${aiUsage.monthCost.toFixed(2)}</b>.</p>
      {:else}
        <p class="muted">No reads yet. Use the camera buttons on Today, or Read on a note.</p>
      {/if}
      <p class="muted" style="font-size:12.5px;margin:0">Photos are shrunk on the phone before sending and are not stored. The cap resets at midnight UTC.</p>
    </div>
  {/if}

  {#if supabase && auth.session}
    <div class="card">
      <p class="eyebrow">Account</p>
      <p class="muted">{auth.session.user.email}</p>
      <button class="danger" onclick={out}>Sign out and clear this device</button>
    </div>
  {/if}
</div>
