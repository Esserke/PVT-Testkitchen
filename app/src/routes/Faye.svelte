<script lang="ts">
  import { stockState } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { verdictStats, loves, notKeen, untried } from '../lib/domain/faye'
  import { CHILD_NAME } from '../lib/constants'
  import { back, go } from '../lib/router.svelte'
  import type { Verdict, ChildMetric } from '../lib/db/types'
  import { childState } from '../lib/childState.svelte'
  import { dailyIntake, weekSummary } from '../lib/domain/childIntake'
  import { toIsoDate } from '../lib/domain/plan'
  import { setChildMealEaten, deleteChildMeal, addChildMetric, deleteChildMetric } from '../lib/actions'

  const todayIso = toIsoDate(new Date())
  const week = $derived(dailyIntake(childState.meals, todayIso, 7))
  const summary = $derived(weekSummary(week))
  const recentMeals = $derived(childState.meals.slice(0, 12))
  const EATEN = ['all', 'most', 'some', 'little', 'none'] as const
  let metricKind = $state<ChildMetric['kind']>('weight_kg')
  let metricValue = $state<number | null>(null)
  let metricText = $state('')
  let metricDate = $state(todayIso)
  async function addMetric(e: Event) {
    e.preventDefault()
    if (metricKind === 'note' ? !metricText.trim() : metricValue === null) return
    await addChildMetric(metricDate, metricKind, metricKind === 'note' ? null : Number(metricValue), metricKind === 'note' ? metricText.trim() : null)
    metricValue = null
    metricText = ''
  }
  const latest = (kind: ChildMetric['kind']) => childState.metrics.find((m) => m.kind === kind)
  const dayLabel = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })

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
    <p class="eyebrow">Meals · last 7 days</p>
    <div class="card">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:13.5px">
        <span><b>{summary.mealsLogged}</b> meals logged</span>
        <span><b>{summary.avgFruitVeg.toFixed(1)}</b> fruit/veg a day</span>
        <span>protein on <b>{summary.proteinDays}</b> days</span>
        <span>ate <b>{summary.avgEaten === null ? '—' : `${Math.round(summary.avgEaten * 100)}%`}</b></span>
      </div>
      <div class="days">
        {#each week as d (d.date)}
          <div class="day" title="{d.date}: {d.meals} meals">
            <div class="bar"><div class="fill" style="height:{d.eaten === null ? 0 : Math.max(3, d.eaten * 40)}px"></div></div>
            <span class="lbl">{dayLabel(d.date)}</span>
            <span class="fv mono">{d.fruitVeg ? `${d.fruitVeg}🥕` : ''}</span>
          </div>
        {/each}
      </div>
      <p class="muted" style="font-size:12px;margin:6px 0 0">Bars show how much of her plate she ate that day. Photograph her plate before and after from the Today screen.</p>
    </div>
    {#if recentMeals.length}
      <div class="card" style="padding:0 12px;margin-top:8px">
        {#each recentMeals as m (m.id)}
          <div class="line" style="font-size:13.5px">
            <div class="row" style="justify-content:space-between">
              <span><span class="muted" style="font-size:12px">{new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })} · {m.slot === 'school_snackbox' ? 'box' : m.slot}</span> {m.description ?? m.item_ids.map((id) => itemsById.get(id)?.name ?? '?').join(', ')}</span>
              <button class="ghost" style="padding:2px 6px;font-size:12px" onclick={() => deleteChildMeal(m.id)} aria-label="Remove">×</button>
            </div>
            <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">
              {#each EATEN as e (e)}<button class="ghost tiny" class:on={m.eaten === e} onclick={() => setChildMealEaten(m, m.eaten === e ? null : e)}>{e}</button>{/each}
              {#if m.notes}<span class="muted" style="font-size:12px">{m.notes}</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <p class="eyebrow">Growth</p>
    <div class="card">
      <div class="row" style="gap:16px;font-size:13.5px;margin-bottom:8px">
        <span>Weight <b>{latest('weight_kg') ? `${latest('weight_kg')!.value} kg` : '—'}</b></span>
        <span>Height <b>{latest('height_cm') ? `${latest('height_cm')!.value} cm` : '—'}</b></span>
      </div>
      <form onsubmit={addMetric} class="row" style="flex-wrap:wrap">
        <select bind:value={metricKind} style="width:auto"><option value="weight_kg">weight kg</option><option value="height_cm">height cm</option><option value="note">note</option></select>
        {#if metricKind === 'note'}<input bind:value={metricText} placeholder="Doctor said…" style="flex:1;min-width:140px" />{:else}<input type="number" step="any" inputmode="decimal" bind:value={metricValue} placeholder="0" style="width:90px" />{/if}
        <input type="date" bind:value={metricDate} style="width:auto" />
        <button type="submit">Add</button>
      </form>
      {#if childState.metrics.length}
        <div style="margin-top:8px">
          {#each childState.metrics.slice(0, 8) as m (m.id)}
            <div class="row" style="justify-content:space-between;font-size:13px;padding:3px 0"><span class="muted">{m.date}</span><span>{m.kind === 'note' ? m.text_value : `${m.value} ${m.kind === 'weight_kg' ? 'kg' : 'cm'}`}</span><button class="ghost" style="padding:2px 6px;font-size:12px" onclick={() => deleteChildMetric(m.id)} aria-label="Remove">×</button></div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

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
  .days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 10px; align-items: end; }
  .day { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .bar { height: 40px; width: 100%; max-width: 28px; display: flex; align-items: end; background: var(--rule-soft); border-radius: 4px; overflow: hidden; }
  .fill { width: 100%; background: var(--ochre); }
  .lbl { font-size: 11px; color: var(--muted); }
  .fv { font-size: 10.5px; color: var(--muted); height: 14px; }
  .tiny { padding: 3px 8px; font-size: 12px; }
  .tiny.on { background: var(--moss); color: #fff; border-color: var(--moss); }
  .left { color: var(--danger); }
</style>
