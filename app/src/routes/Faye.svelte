<script lang="ts">
  import { stockState } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { verdictStats, loves, notKeen, untried } from '../lib/domain/faye'
  import { CHILD_NAME } from '../lib/constants'
  import { back, go } from '../lib/router.svelte'
  import type { Verdict } from '../lib/db/types'

  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const active = $derived(stockState.items.filter((i) => !i.archived))
  const stats = $derived(verdictStats(planState.slots))
  const lovesList = $derived(loves(active, stats))
  const notKeenList = $derived(notKeen(active, stats))
  const untriedList = $derived(untried(active, stats))
  const boxes = $derived(
    planState.slots.filter((s) => s.slot === 'school_snackbox' && s.item_ids.length).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
  )
  const packedCount = $derived(planState.slots.filter((s) => s.slot === 'school_snackbox' && s.status === 'cooked').length)
  const verdictCount = $derived(planState.slots.reduce((n, s) => n + Object.keys(s.item_verdicts ?? {}).length, 0))
  const sym = (v: Verdict | undefined) => (v === 'ate' ? '✓' : v === 'some' ? '~' : v === 'left' ? '✗' : '·')
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const when = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
</script>

<div class="page">
  <div class="row" style="justify-content:space-between;margin-bottom:12px">
    <button class="ghost" onclick={back}>Back</button>
    <button class="ghost" onclick={() => go('plan')}>Plan</button>
  </div>
  <p class="eyebrow">{CHILD_NAME}</p>
  <h2 style="margin-bottom:6px">What she eats</h2>
  <p class="muted" style="font-size:13.5px">{packedCount} box{packedCount === 1 ? '' : 'es'} packed · {verdictCount} verdict{verdictCount === 1 ? '' : 's'} logged. When a box comes home, open it on Plan and tap each item: ate, some, or left.</p>

  <section>
    <p class="eyebrow">Loves</p>
    {#if lovesList.length === 0}
      <div class="empty">Nothing yet. Needs two or more verdicts on an item.</div>
    {:else}
      <div class="card" style="padding:0 12px">
        {#each lovesList as { item, st } (item.id)}
          <div class="row line"><span style="flex:1">{item.name}</span><div class="track"><div class="fill" style="width:{pct(st.score)}"></div></div><span class="mono muted">{st.ate}/{st.ate + st.some + st.left}</span></div>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <p class="eyebrow">Not keen</p>
    {#if notKeenList.length === 0}
      <div class="empty">Nothing comes back often. Long may it last.</div>
    {:else}
      <div class="card" style="padding:0 12px">
        {#each notKeenList as { item, st } (item.id)}
          <div class="row line"><span style="flex:1">{item.name}</span><div class="track"><div class="fill bad" style="width:{pct(st.left / (st.ate + st.some + st.left))}"></div></div><span class="mono muted">left {st.left}×</span></div>
        {/each}
      </div>
      <p class="muted" style="font-size:12px;margin-top:6px">Auto-fill skips these while there is anything else to pack. Tastes change, so try again in a month.</p>
    {/if}
  </section>

  <section>
    <p class="eyebrow">Not tried yet</p>
    {#if untriedList.length === 0}
      <div class="empty">Everything marked for the snack box has been packed at least once.</div>
    {:else}
      <div class="card"><p style="margin:0;font-size:14px">{untriedList.map((i) => i.name).join(' · ')}</p></div>
    {/if}
  </section>

  <section>
    <p class="eyebrow">Recent boxes</p>
    {#if boxes.length === 0}
      <div class="empty">No boxes yet.</div>
    {:else}
      <div class="card" style="padding:0 12px">
        {#each boxes as b (b.id)}
          <div class="line" style="font-size:13.5px">
            <div class="muted" style="font-size:12px">{when(b.date)}{b.status === 'cooked' ? '' : ' · not packed'}</div>
            <div>{#each b.item_ids as id, i (id)}{i ? ', ' : ''}<span class:ate={b.item_verdicts?.[id] === 'ate'} class:left={b.item_verdicts?.[id] === 'left'}>{sym(b.item_verdicts?.[id])} {itemsById.get(id)?.name ?? '?'}</span>{/each}</div>
            {#if b.notes}<div class="muted" style="font-size:12.5px">{b.notes}</div>{/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  section { margin: 16px 0; }
  .eyebrow { margin-bottom: 6px; }
  .line { padding: 8px 0; border-bottom: 1px solid var(--rule-soft); }
  .line:last-child { border-bottom: 0; }
  .track { width: 90px; height: 8px; background: var(--rule-soft); border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; background: var(--moss); }
  .fill.bad { background: var(--danger); }
  .ate { color: var(--moss); }
  .left { color: var(--danger); }
</style>
