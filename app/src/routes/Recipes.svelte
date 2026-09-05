<script lang="ts">
  import { planState } from '../lib/planState.svelte'
  import { lastCookedByRecipe } from '../lib/domain/plan'
  import { newRecipe, newIdea, saveIdea } from '../lib/actions'
  import { go } from '../lib/router.svelte'
  import { showToast } from '../lib/toast.svelte'
  import type { Idea } from '../lib/db/types'

  let tab = $state<'favourites' | 'ideas'>('favourites')
  let q = $state('')
  const lastCooked = $derived(lastCookedByRecipe(planState.slots))
  const timesCooked = $derived.by(() => {
    const m = new Map<string, number>()
    for (const s of planState.slots) if (s.recipe_id && s.status === 'cooked') m.set(s.recipe_id, (m.get(s.recipe_id) ?? 0) + 1)
    return m
  })
  const recipes = $derived.by(() => {
    const n = q.trim().toLowerCase()
    return planState.recipes.filter((r) => !n || r.title.toLowerCase().includes(n) || r.tags.some((t) => t.includes(n)))
  })
  const ideas = $derived(planState.ideas.filter((i) => i.status === 'idea' || i.status === 'scheduled'))

  async function create() {
    const r = await newRecipe(q.trim() || 'New recipe')
    go('recipe', r.id)
  }

  let ideaTitle = $state('')
  let ideaUrl = $state('')
  let ideaWhy = $state('')
  async function addIdea(e: Event) {
    e.preventDefault()
    if (!ideaTitle.trim()) return
    await newIdea(ideaTitle.trim(), ideaUrl.trim() || null, ideaWhy.trim() || null)
    ideaTitle = ''
    ideaUrl = ''
    ideaWhy = ''
  }
  async function cookIt(i: Idea) {
    const r = await newRecipe(i.title, i.source_url)
    await saveIdea({ ...i, status: 'cooked' })
    go('recipe', r.id)
  }
  async function drop(i: Idea) {
    await saveIdea({ ...i, status: 'dropped' })
    showToast(`Dropped ${i.title}`, () => saveIdea({ ...i, status: 'idea' }).then(() => {}))
  }
  const stars = (n: number | undefined) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '')
  const when = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'never')
</script>

<div class="page">
  <div class="row" style="margin-bottom:14px">
    <button class:ghost={tab !== 'favourites'} onclick={() => (tab = 'favourites')}>Favourites · {planState.recipes.length}</button>
    <button class:ghost={tab !== 'ideas'} onclick={() => (tab = 'ideas')}>Ideas · {ideas.length}</button>
  </div>

  {#if tab === 'favourites'}
    <div class="row" style="margin-bottom:14px">
      <input bind:value={q} placeholder="Search or type a new name" aria-label="Search recipes" />
      <button onclick={create}>New</button>
    </div>
    {#if recipes.length === 0}
      <div class="empty">{planState.recipes.length ? 'Nothing matches.' : 'No recipes yet. Tap New and add the first favourite.'}</div>
    {:else}
      <div class="list">
        {#each recipes as r (r.id)}
          <button class="card rcard" onclick={() => go('recipe', r.id)}>
            <div class="row" style="justify-content:space-between">
              <b>{r.title}</b>
              <span class="mono" style="color:var(--ochre);font-size:12px">{stars(r.rating?.household)}</span>
            </div>
            <div class="muted" style="font-size:12.5px">
              {#if r.tags.length}{r.tags.join(' · ')} · {/if}
              cooked {timesCooked.get(r.id) ?? 0}× · last {when(lastCooked.get(r.id))}
              {#if r.daughter_verdict} · she {r.daughter_verdict === 'ate' ? 'ate it' : r.daughter_verdict === 'picked' ? 'picked at it' : 'refused it'}{/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  {:else}
    <form class="card" onsubmit={addIdea} style="margin-bottom:14px">
      <p class="eyebrow">Something to try</p>
      <div class="field"><input bind:value={ideaTitle} placeholder="Lentil dhal" required aria-label="Idea" /></div>
      <div class="field"><input bind:value={ideaUrl} placeholder="Link (optional)" inputmode="url" aria-label="Link" /></div>
      <div class="field"><input bind:value={ideaWhy} placeholder="Why? (optional)" aria-label="Why" /></div>
      <button type="submit" disabled={!ideaTitle.trim()}>Add idea</button>
    </form>
    {#if ideas.length === 0}
      <div class="empty">Nothing on the list. Add anything you might like to cook some week.</div>
    {:else}
      <div class="list">
        {#each ideas as i (i.id)}
          <div class="card">
            <div class="row" style="justify-content:space-between">
              <b>{i.title}</b>
              {#if i.status === 'scheduled'}<span class="pill warn">planned</span>{/if}
            </div>
            {#if i.why}<div class="muted" style="font-size:13px">{i.why}</div>{/if}
            {#if i.source_url}<a href={i.source_url} target="_blank" rel="noopener" style="font-size:13px">Open link</a>{/if}
            <div class="row" style="margin-top:8px">
              <button class="ghost" onclick={() => cookIt(i)}>Cooked it → recipe</button>
              <button class="ghost" onclick={() => drop(i)}>Drop</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .rcard { text-align: left; color: var(--ink); display: block; width: 100%; font-weight: 400; }
</style>
