<script lang="ts">
  import { stockState } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { forecastMap } from '../lib/forecastState.svelte'
  import { describe, rateChange, todayIso } from '../lib/domain/forecast'
  import { eventsByItem } from '../lib/stockState.svelte'
  import { spendByMonth, recipeRotation, snackVariety, cameBack, waste } from '../lib/domain/insights'
  import { go, back } from '../lib/router.svelte'

  const today = todayIso()
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const forecasts = $derived(forecastMap())
  const active = $derived(stockState.items.filter((i) => !i.archived))

  const runningOut = $derived(
    active
      .map((item) => ({ item, f: forecasts.get(item.id)! }))
      .filter(({ f }) => f && f.method !== 'none' && f.daysLeft !== null)
      .sort((a, b) => a.f.daysLeft! - b.f.daysLeft!)
      .slice(0, 15),
  )
  const changes = $derived.by(() => {
    const by = eventsByItem(stockState.events)
    return active
      .map((item) => ({ item, change: rateChange(by.get(item.id) ?? [], today) }))
      .filter((x): x is { item: typeof x.item; change: number } => x.change !== null && Math.abs(x.change) >= 0.3)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 6)
  })
  const spend = $derived(spendByMonth(stockState.events, itemsById, today, 6))
  const maxSpend = $derived(Math.max(1, ...spend.map((m) => m.total)))
  const thisMonth = $derived(spend[0])
  const rotation = $derived(recipeRotation(planState.recipes, planState.slots, today))
  const variety = $derived(snackVariety(planState.slots, today, 4))
  const returned = $derived(cameBack(planState.slots, today))
  const thrown = $derived(waste(stockState.events, itemsById, today))

  const rand = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`
  const monthName = (m: string) => new Date(m + '-01').toLocaleDateString(undefined, { month: 'short' })
  const dot = (c: string) => (c === 'high' ? '●●●' : c === 'medium' ? '●●○' : '●○○')
</script>

<div class="page">
  <button class="ghost" onclick={back} style="margin-bottom:12px">Back</button>

  <section>
    <p class="eyebrow">Running out</p>
    {#if runningOut.length === 0}
      <div class="empty">No forecasts yet. They appear once items have been used, finished or bought a few times.</div>
    {:else}
      <div class="card" style="padding:0 12px">
        {#each runningOut as { item, f } (item.id)}
          <button class="row line" onclick={() => go('item', item.id)}>
            <span style="flex:1;text-align:left">{item.name}</span>
            <span class="muted" style="font-size:13px">{describe(f, item)}</span>
            <span class="mono conf" title="confidence: {f.confidence}">{dot(f.confidence)}</span>
          </button>
        {/each}
      </div>
      <p class="muted" style="font-size:12px;margin-top:6px">Dots show how much history the estimate rests on.</p>
    {/if}
  </section>

  {#if changes.length}
    <section>
      <p class="eyebrow">Changed pace</p>
      <div class="card" style="padding:0 12px">
        {#each changes as { item, change } (item.id)}
          <div class="row line"><span style="flex:1">{item.name}</span><span class="pill" class:warn={change > 0}>{change > 0 ? 'up' : 'down'} {Math.round(Math.abs(change) * 100)}%</span></div>
        {/each}
      </div>
      <p class="muted" style="font-size:12px;margin-top:6px">Last four weeks against the four before.</p>
    </section>
  {/if}

  <section>
    <p class="eyebrow">Spend</p>
    {#if spend.every((m) => m.total === 0)}
      <div class="empty">Type prices on the shopping list as you tick things off and spend appears here.</div>
    {:else}
      <div class="card">
        <div class="bars" role="img" aria-label="Spend per month for the last six months">
          {#each [...spend].reverse() as m (m.month)}
            <div class="bar" title="{monthName(m.month)}: {rand(m.total)}">
              <span class="val mono">{m.total ? rand(m.total) : ''}</span>
              <div class="fill" style="height:{Math.max(2, (m.total / maxSpend) * 72)}px"></div>
              <span class="lbl">{monthName(m.month)}</span>
            </div>
          {/each}
        </div>
        {#if thisMonth && thisMonth.total > 0}
          <p class="eyebrow" style="margin:14px 0 6px">This month by category</p>
          {#each thisMonth.byCategory.slice(0, 6) as [cat, v] (cat)}
            <div class="hrow"><span>{cat}</span><div class="track"><div class="hfill" style="width:{(v / thisMonth.total) * 100}%"></div></div><span class="mono">{rand(v)}</span></div>
          {/each}
          <p class="eyebrow" style="margin:14px 0 6px">By shop</p>
          {#each thisMonth.byShop as [shop, v] (shop)}
            <div class="hrow"><span>{shop}</span><div class="track"><div class="hfill" style="width:{(v / thisMonth.total) * 100}%"></div></div><span class="mono">{rand(v)}</span></div>
          {/each}
        {/if}
      </div>
    {/if}
  </section>

  <section>
    <p class="eyebrow">Recipes</p>
    <div class="card">
      {#if rotation.rut.length}
        <p style="margin-bottom:4px"><b>In a rut</b> <span class="muted">cooked 3+ times in four weeks</span></p>
        <p>{rotation.rut.map((r) => `${r.recipe.title} ×${r.times}`).join(' · ')}</p>
      {/if}
      {#if rotation.forgotten.length}
        <p style="margin-bottom:4px"><b>Forgotten favourites</b> <span class="muted">rated 4+ and not cooked in eight weeks</span></p>
        <p>{rotation.forgotten.map((r) => r.recipe.title).join(' · ')}</p>
      {/if}
      <p class="muted" style="margin:0">Ideas tried in the last eight weeks: {rotation.tried}</p>
    </div>
  </section>

  <section>
    <div class="row" style="justify-content:space-between"><p class="eyebrow">Snack box</p><button class="ghost" style="padding:4px 8px;font-size:13px" onclick={() => go('faye')}>What she eats</button></div>
    <div class="card">
      {#if variety.length === 0}
        <p class="muted" style="margin:0">Plan a week of snack boxes and variety shows here.</p>
      {:else}
        {#each variety as w (w.week)}
          <div class="hrow"><span>wk {new Date(w.week).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><div class="track"><div class="hfill ochre" style="width:{w.score * 100}%"></div></div><span class="mono">{w.unique}/{w.total}</span></div>
        {/each}
        <p class="muted" style="font-size:12px;margin:6px 0 0">Different items out of all items packed. Higher is more varied.</p>
      {/if}
      {#if returned.length}
        <p style="margin:12px 0 4px"><b>Came back uneaten</b></p>
        {#each returned.slice(0, 6) as r (r.date)}
          <div class="muted" style="font-size:13.5px">{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}: {r.notes}</div>
        {/each}
      {/if}
    </div>
  </section>

  <section>
    <p class="eyebrow">Thrown away · last four weeks</p>
    <div class="card">
      {#if thrown.lines.length === 0}
        <p class="muted" style="margin:0">Nothing logged. Use "Threw away" on an item when something goes off.</p>
      {:else}
        {#each thrown.lines as l (l.item.id)}
          <div class="row line"><span style="flex:1">{l.item.name}</span><span class="muted">{l.quantity} {l.item.unit}</span><span class="mono">{l.cost != null ? rand(l.cost) : ''}</span></div>
        {/each}
        {#if thrown.total}<p style="margin:8px 0 0;text-align:right"><b>about {rand(thrown.total)}</b></p>{/if}
      {/if}
    </div>
  </section>
</div>

<style>
  section { margin-bottom: 20px; }
  .eyebrow { margin-bottom: 6px; }
  .line { padding: 8px 0; border-bottom: 1px solid var(--rule-soft); width: 100%; background: none; color: var(--ink); border-radius: 0; font-weight: 400; }
  .line:last-child { border-bottom: 0; }
  .conf { font-size: 9px; color: var(--moss); letter-spacing: 1px; }
  .bars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; align-items: end; height: 110px; }
  .bar { display: flex; flex-direction: column; align-items: center; justify-content: end; gap: 4px; height: 100%; }
  .fill { width: 100%; max-width: 36px; background: var(--moss); border-radius: 4px 4px 0 0; }
  .val { font-size: 10.5px; color: var(--ink-2); }
  .lbl { font-size: 11px; color: var(--muted); }
  .hrow { display: grid; grid-template-columns: 110px 1fr 64px; gap: 10px; align-items: center; font-size: 13.5px; padding: 4px 0; }
  .hrow .mono { text-align: right; font-size: 12.5px; }
  .track { height: 8px; background: var(--rule-soft); border-radius: 4px; overflow: hidden; }
  .hfill { height: 100%; background: var(--moss); border-radius: 4px; }
  .hfill.ochre { background: var(--ochre); }
</style>
