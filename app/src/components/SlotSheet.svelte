<script lang="ts">
  import type { MealSlot, MealSlotName, Recipe, Idea, Item } from '../lib/db/types'
  import { planState, ingredientsByRecipe, slotAt } from '../lib/planState.svelte'
  import { stockState } from '../lib/stockState.svelte'
  import { upsertSlot, clearSlot, cookSlot, leftoversTomorrow, saveIdea, saveSlot } from '../lib/actions'
  import { SLOTS, addDays } from '../lib/domain/plan'
  import { showToast } from '../lib/toast.svelte'

  let { date, slot, existing, onclose }: { date: string; slot: MealSlotName; existing: MealSlot | undefined; onclose: () => void } = $props()
  let q = $state('')
  const label = $derived(SLOTS.find((s) => s.slot === slot)?.label ?? slot)
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))
  const recipe = $derived(existing?.recipe_id ? planState.recipes.find((r) => r.id === existing!.recipe_id) ?? null : null)
  const needle = $derived(q.trim().toLowerCase())
  const recipes = $derived(planState.recipes.filter((r) => !needle || r.title.toLowerCase().includes(needle)).slice(0, 8))
  const ideas = $derived(planState.ideas.filter((i) => i.status === 'idea' && (!needle || i.title.toLowerCase().includes(needle))).slice(0, 5))
  const items = $derived(needle.length >= 2 ? stockState.items.filter((i) => !i.archived && i.kid_ok && i.name.toLowerCase().includes(needle)).slice(0, 8) : [])

  async function pickRecipe(r: Recipe) {
    await upsertSlot(existing, date, slot, { recipe_id: r.id, free_text: null, servings: 3, status: 'planned' })
    onclose()
  }
  async function pickIdea(i: Idea) {
    await upsertSlot(existing, date, slot, { recipe_id: null, free_text: `Idea: ${i.title}`, status: 'planned' })
    await saveIdea({ ...i, status: 'scheduled' })
    onclose()
  }
  async function toggleItem(i: Item) {
    const ids = existing?.item_ids ?? []
    const next = ids.includes(i.id) ? ids.filter((x) => x !== i.id) : [...ids, i.id]
    await upsertSlot(existing, date, slot, { item_ids: next, status: 'planned' })
  }
  async function freeText(e: Event) {
    e.preventDefault()
    if (!q.trim()) return
    await upsertSlot(existing, date, slot, { recipe_id: null, free_text: q.trim(), status: 'planned' })
    onclose()
  }
  async function cooked() {
    if (!existing) return
    const n = await cookSlot(existing, recipe, recipe ? (ingredientsByRecipe(planState.ingredients).get(recipe.id) ?? []) : [], itemsById)
    showToast(n ? `Cooked. ${n} ingredient${n === 1 ? '' : 's'} deducted from stock.` : 'Marked cooked.')
    onclose()
  }
  async function leftovers() {
    if (!existing) return
    await leftoversTomorrow(existing, recipe?.title ?? existing.free_text ?? 'dinner', slotAt(planState.slots, addDays(date, 1), 'lunch'))
    showToast('Tomorrow’s lunch is leftovers')
    onclose()
  }
  async function skip() {
    if (!existing) return
    await saveSlot({ ...existing, status: existing.status === 'skipped' ? 'planned' : 'skipped' })
    onclose()
  }
  async function clear() {
    if (existing) await clearSlot(existing)
    onclose()
  }
  const pretty = $derived(new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }))
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-label="{label} on {pretty}">
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <div><h2>{label}</h2><div class="muted" style="font-size:13px">{pretty}</div></div>
    <button class="ghost" onclick={onclose}>Close</button>
  </div>

  {#if existing && (existing.recipe_id || existing.free_text || existing.item_ids.length)}
    <div class="card" style="margin-bottom:12px">
      <b>{recipe?.title ?? existing.free_text ?? ''}</b>
      {#if existing.item_ids.length}<div class="muted" style="font-size:13px">{existing.item_ids.map((id) => itemsById.get(id)?.name ?? '?').join(', ')}</div>{/if}
      <div class="row" style="margin-top:8px;flex-wrap:wrap">
        {#if existing.status !== 'cooked'}<button onclick={cooked}>{slot === 'school_snackbox' ? 'Packed' : 'Cooked'}</button>{:else}<span class="pill">done</span>{/if}
        {#if slot === 'dinner'}<button class="ghost" onclick={leftovers}>Leftovers → lunch</button>{/if}
        <button class="ghost" onclick={skip}>{existing.status === 'skipped' ? 'Unskip' : 'Skip'}</button>
        <button class="ghost" onclick={clear}>Clear</button>
      </div>
    </div>
  {/if}

  <form onsubmit={freeText} class="row" style="margin-bottom:10px">
    <input bind:value={q} placeholder="Search recipes and items, or type anything" aria-label="What to eat" />
    <button type="submit" disabled={!q.trim()}>Use</button>
  </form>
  <div class="scroll">
    {#if recipes.length}<p class="eyebrow">Recipes</p>
      <div class="chips">{#each recipes as r (r.id)}<button class="ghost chip" onclick={() => pickRecipe(r)}>{r.title}</button>{/each}</div>{/if}
    {#if ideas.length}<p class="eyebrow">Ideas</p>
      <div class="chips">{#each ideas as i (i.id)}<button class="ghost chip idea" onclick={() => pickIdea(i)}>{i.title}</button>{/each}</div>{/if}
    {#if items.length}<p class="eyebrow">Items</p>
      <div class="chips">{#each items as i (i.id)}<button class="ghost chip" class:on={existing?.item_ids.includes(i.id)} onclick={() => toggleItem(i)}>{i.name}</button>{/each}</div>{/if}
    {#if !recipes.length && !ideas.length && !items.length}<p class="muted" style="font-size:13px">No matches. Tap Use to save what you typed.</p>{/if}
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface); border-radius: 16px 16px 0 0;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; max-height: 85vh; display: flex; flex-direction: column; }
  .scroll { overflow-y: auto; }
  .eyebrow { margin: 8px 0 6px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 7px 11px; font-size: 13.5px; }
  .chip.on { background: var(--moss); color: #fff; border-color: var(--moss); }
  .chip.idea { border-style: dashed; }
</style>
