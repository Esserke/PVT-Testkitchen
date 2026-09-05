<script lang="ts">
  import { route, back, go } from '../lib/router.svelte'
  import { planState, ingredientsByRecipe } from '../lib/planState.svelte'
  import { stockState } from '../lib/stockState.svelte'
  import { saveRecipe, saveIngredient, deleteIngredient, blankIngredient } from '../lib/actions'
  import { softDelete } from '../lib/db/repo'
  import { showToast } from '../lib/toast.svelte'
  import type { Recipe, RecipeIngredient } from '../lib/db/types'

  const recipe = $derived(planState.recipes.find((r) => r.id === route.param) ?? null)
  const saved = $derived(recipe ? (ingredientsByRecipe(planState.ingredients).get(recipe.id) ?? []) : [])

  let draft = $state<Recipe | null>(null)
  let rows = $state<(RecipeIngredient & { name: string })[]>([])
  let tagText = $state('')
  let loadedFor = $state<string | null>(null)
  $effect(() => {
    if (recipe && loadedFor !== recipe.id) {
      loadedFor = recipe.id
      draft = { ...recipe }
      tagText = recipe.tags.join(', ')
      rows = saved.map((i) => ({ ...i, name: i.item_id ? stockState.items.find((x) => x.id === i.item_id)?.name ?? '' : i.free_text ?? '' }))
      if (!rows.length) rows = [{ ...blankIngredient(recipe.id), name: '' }]
    }
  })
  const TAGS = ['quick', 'weeknight', 'batch-cook', 'freezer-friendly', 'kid-favourite', 'braai', 'one-pot', 'leftovers-lunch']

  function addRow() {
    if (draft) rows = [...rows, { ...blankIngredient(draft.id), name: '' }]
  }
  function removeRow(i: number) {
    rows = rows.filter((_, idx) => idx !== i)
  }
  function matchItem(name: string) {
    const n = name.trim().toLowerCase()
    return stockState.items.find((i) => i.name.toLowerCase() === n || i.aliases.some((a) => a.toLowerCase() === n))
  }

  async function save(e: Event) {
    e.preventDefault()
    if (!draft) return
    await saveRecipe({ ...draft, title: draft.title.trim() || 'Untitled', tags: tagText.split(',').map((t) => t.trim()).filter(Boolean) })
    const keep = new Set<string>()
    for (const r of rows) {
      if (!r.name.trim()) continue
      const item = matchItem(r.name)
      keep.add(r.id)
      await saveIngredient({
        id: r.id, household_id: r.household_id, updated_at: r.updated_at, deleted: false, recipe_id: r.recipe_id,
        item_id: item?.id ?? null, free_text: item ? null : r.name.trim(),
        quantity: r.quantity === null || (r.quantity as unknown) === '' ? null : Number(r.quantity), unit: r.unit?.trim() || null, optional: r.optional,
      })
    }
    for (const s of saved) if (!keep.has(s.id)) await deleteIngredient(s.id)
    showToast('Saved')
    back()
  }
  async function remove() {
    if (!draft) return
    await softDelete('recipe', draft.id)
    showToast('Recipe deleted')
    go('recipes')
  }
  function rate(n: number) {
    if (draft) draft.rating = { ...draft.rating, household: n }
  }
</script>

<div class="page">
  {#if !draft}
    <div class="empty">Recipe not found. <button class="ghost" onclick={() => go('recipes')}>Back</button></div>
  {:else}
    <form class="card" onsubmit={save}>
      <div class="field"><label for="t">Name</label><input id="t" bind:value={draft.title} required /></div>
      <div class="row">
        <div class="field" style="flex:1"><label for="sv">Serves</label><input id="sv" type="number" min="1" inputmode="numeric" bind:value={draft.servings} /></div>
        <div class="field" style="flex:1"><label for="pm">Prep min</label><input id="pm" type="number" min="0" inputmode="numeric" bind:value={draft.prep_minutes} /></div>
        <div class="field" style="flex:1"><label for="cm">Cook min</label><input id="cm" type="number" min="0" inputmode="numeric" bind:value={draft.cook_minutes} /></div>
      </div>

      <p class="eyebrow" style="margin:6px 0">Ingredients</p>
      <p class="muted" style="font-size:12.5px">Type a name from Stock and it links to that item, so cooking deducts it and the list can buy it. Anything else stays as text.</p>
      <datalist id="stock-items">{#each stockState.items as i (i.id)}<option value={i.name}></option>{/each}</datalist>
      {#each rows as r, i (r.id)}
        <div class="ing">
          <input bind:value={r.name} list="stock-items" placeholder="Beef mince" aria-label="Ingredient" class:linked={!!matchItem(r.name)} />
          <input type="number" step="any" min="0" inputmode="decimal" bind:value={r.quantity} placeholder="500" aria-label="Quantity" />
          <input bind:value={r.unit} placeholder="g" aria-label="Unit" />
          <button type="button" class="ghost x" onclick={() => removeRow(i)} aria-label="Remove ingredient">×</button>
        </div>
      {/each}
      <button type="button" class="ghost" onclick={addRow} style="margin:4px 0 14px">Add ingredient</button>

      <div class="field"><label for="tags">Tags</label><input id="tags" bind:value={tagText} placeholder={TAGS.slice(0, 4).join(', ')} /></div>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin:-6px 0 12px">
        {#each TAGS as t}<button type="button" class="ghost chip" onclick={() => (tagText = tagText.includes(t) ? tagText : [tagText, t].filter(Boolean).join(', '))}>{t}</button>{/each}
      </div>

      <div class="row" style="margin-bottom:12px">
        <div style="flex:1">
          <label for="rate">Our rating</label>
          <div class="row" id="rate">
            {#each [1, 2, 3, 4, 5] as n}<button type="button" class="star" class:on={(draft.rating?.household ?? 0) >= n} onclick={() => rate(n)} aria-label="{n} stars">★</button>{/each}
          </div>
        </div>
        <div class="field" style="flex:1;margin:0"><label for="dv">Daughter</label>
          <select id="dv" bind:value={draft.daughter_verdict}><option value={null}>—</option><option value="ate">ate it</option><option value="picked">picked at it</option><option value="refused">refused</option></select></div>
      </div>
      <div class="field"><label for="url">Link</label><input id="url" bind:value={draft.source_url} inputmode="url" placeholder="https://" /></div>
      <div class="field"><label for="steps">Method</label><textarea id="steps" bind:value={draft.steps} rows="6" placeholder="Brown the mince…"></textarea></div>
      <div class="row" style="justify-content:space-between">
        <div class="row"><button type="submit">Save</button><button type="button" class="ghost" onclick={back}>Cancel</button></div>
        <button type="button" class="ghost" onclick={remove}>Delete</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .ing { display: grid; grid-template-columns: 1fr 70px 60px 36px; gap: 6px; margin-bottom: 6px; }
  .ing input { padding: 8px 10px; }
  .linked { border-color: var(--moss); }
  .x { padding: 0; }
  .chip { padding: 5px 9px; font-size: 12.5px; }
  .star { background: none; color: var(--rule); font-size: 26px; padding: 0 2px; line-height: 1; }
  .star.on { color: var(--ochre); }
  textarea { width: 100%; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 10px 12px; }
</style>
