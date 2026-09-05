<script lang="ts">
  import { liveQuery } from 'dexie'
  import { db } from '../lib/db/schema'
  import { household } from '../lib/household.svelte'
  import { go } from '../lib/router.svelte'

  let itemCount = $state(0)
  $effect(() => {
    const id = household.id
    if (!id) return
    const sub = liveQuery(() => db.item.where('household_id').equals(id).filter((i) => !i.deleted && !i.archived).count()).subscribe((n) => (itemCount = n))
    return () => sub.unsubscribe()
  })

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
</script>

<div class="page">
  <p class="eyebrow">{today}</p>
  <h2 style="margin-bottom:12px">{household.name ?? 'Home'}</h2>

  <div class="card" style="margin-bottom:12px">
    <p class="eyebrow">Phase 0</p>
    <p>The shell is up. Stock holds {itemCount} {itemCount === 1 ? 'item' : 'items'}. Add a few on each phone and watch them appear on the other.</p>
    <button onclick={() => go('stock')}>Open stock</button>
  </div>

  <div class="card muted">
    <p class="eyebrow">Coming next</p>
    <p style="margin:0">Today's meals and the snack box, what is running out before the next trip, and the finished-tap grid.</p>
  </div>
</div>
