<script lang="ts">
  // Shows what the reader proposed and applies only the rows the user keeps.
  import type { Kind, Result, MessageResult, ShelfResult, ReceiptResult, RecipeResult, LunchboxResult, ChildPlateResult, Mode } from '../lib/ai'
  import { stockMap, stockState as ss } from '../lib/stockState.svelte'
  import { childState } from '../lib/childState.svelte'
  import { newChildMeal, saveChildMeal, saveReceiptRecord } from '../lib/actions'
  import { stockState } from '../lib/stockState.svelte'
  import { planState } from '../lib/planState.svelte'
  import { recordEvent, bought, newTrip, addLine, saveRecipe, saveIngredient, blankIngredient, upsertSlot, cookSlot, saveSlot } from '../lib/actions'
  import { slotAt, ingredientsByRecipe } from '../lib/planState.svelte'
  import { toIsoDate, SLOTS } from '../lib/domain/plan'
  import { CHILD_NAME } from '../lib/constants'
  import type { MealSlotName, Verdict } from '../lib/db/types'
  import { put, newId } from '../lib/db/repo'
  import { household } from '../lib/household.svelte'
  import { db } from '../lib/db/schema'
  import { showToast } from '../lib/toast.svelte'
  import { go } from '../lib/router.svelte'
  import type { Item, Trip } from '../lib/db/types'

  let { kind, result, location = null, mode = 'packed', onclose, ondone }: { kind: Kind; result: Result; location?: string | null; mode?: Mode; onclose: () => void; ondone?: () => void } = $props()
  const stockNow = $derived(stockMap(ss.items, ss.events))
  const today = toIsoDate(new Date())
  // Plate photos also log the meal: which slot, how many plates, and whether it was cooked now.
  const hour = new Date().getHours()
  let mealSlot = $state<MealSlotName>(hour < 10.5 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner')
  let plates = $state<number>(2)
  $effect(() => {
    const sv = (result as RecipeResult).servings
    if (kind === 'plate' && sv) plates = sv
  })
  let cookedNow = $state(true)
  const mealSlots = SLOTS.filter((s) => s.slot !== 'school_snackbox')
  const itemsById = $derived(new Map(stockState.items.map((i) => [i.id, i])))

  interface Row { key: string; label: string; detail: string; qty: number | null; keep: boolean; item: Item | undefined; raw: unknown; isNew: boolean; price?: number | null }
  let rows = $state<Row[]>([])
  let busy = $state(false)

  function nameOf(m: { item_id: string | null; item_name: string }) {
    return (m.item_id && itemsById.get(m.item_id)?.name) || m.item_name
  }
  $effect(() => {
    const out: Row[] = []
    if (kind === 'message') {
      const r = result as MessageResult
      r.events.forEach((e, i) => out.push({ key: `e${i}`, label: nameOf(e), detail: e.type === 'finished' ? 'finished' : `${e.type} ${e.quantity}`, qty: e.quantity, keep: !!e.item_id, item: e.item_id ? itemsById.get(e.item_id) : undefined, raw: e, isNew: !e.item_id }))
      r.list_lines.forEach((l, i) => out.push({ key: `l${i}`, label: nameOf(l), detail: `add to list ×${l.quantity}`, qty: l.quantity, keep: true, item: l.item_id ? itemsById.get(l.item_id) : undefined, raw: l, isNew: !l.item_id }))
    } else if (kind === 'shelf_photo') {
      // A stock take: compare what the app believes with what the photo shows. Only differences start ticked.
      ;(result as ShelfResult).items.forEach((it, i) => {
        const item = it.item_id ? itemsById.get(it.item_id) : undefined
        const have = item ? stockNow.get(item.id)?.stock ?? null : null
        const differs = have === null || Math.abs(have - it.quantity) > 0.001
        const hidden = it.partly_hidden
        const detail = item
          ? hidden ? `partly hidden · saw ${it.quantity} ${item.unit}${have !== null ? `, app says ${have}` : ''}`
            : have === null ? `app: uncounted → photo: ${it.quantity} ${item.unit}`
            : differs ? `app: ${have} → photo: ${it.quantity} ${item.unit} (${it.quantity - have > 0 ? '+' : ''}${Math.round((it.quantity - have) * 100) / 100})`
            : `agrees: ${have} ${item.unit}`
          : `${it.confidence} confidence · new item`
        // Never lower a count from a photo that could not see everything unless the user says so.
        const wouldLower = have !== null && it.quantity < have
        out.push({ key: `s${i}`, label: nameOf(it), detail, qty: it.quantity, keep: !!item && differs && it.confidence !== 'low' && !hidden && !(wouldLower && hidden), item, raw: it, isNew: !it.item_id })
      })
    } else if (kind === 'receipt') {
      ;(result as ReceiptResult).lines.forEach((l, i) => out.push({ key: `r${i}`, label: nameOf(l), detail: `${l.text}${l.price != null ? ` · R${l.price}` : ''}`, qty: l.quantity, keep: l.is_food_or_household && !!l.item_id, item: l.item_id ? itemsById.get(l.item_id) : undefined, raw: l, isNew: !l.item_id && l.is_food_or_household, price: l.price }))
    } else if (kind === 'child_plate') {
      ;(result as ChildPlateResult).items.forEach((it, i) => out.push({ key: `p${i}`, label: nameOf(it), detail: `${it.confidence} confidence`, qty: null, keep: !!it.item_id, item: it.item_id ? itemsById.get(it.item_id) : undefined, raw: it, isNew: false }))
    } else if (kind === 'lunchbox') {
      ;(result as LunchboxResult).items.forEach((it, i) => out.push({ key: `b${i}`, label: nameOf(it), detail: mode === 'home' ? (it.state === 'gone' ? 'gone → ate' : it.state === 'partly_eaten' ? 'partly eaten → some' : 'untouched → left') : `${it.confidence} confidence`, qty: null, keep: !!it.item_id && it.confidence !== 'low', item: it.item_id ? itemsById.get(it.item_id) : undefined, raw: it, isNew: false }))
    } else {
      ;(result as RecipeResult).ingredients.forEach((g, i) => out.push({ key: `g${i}`, label: nameOf(g), detail: `${g.quantity ?? ''} ${g.unit ?? ''}${g.optional ? ' · optional' : ''}`.trim(), qty: g.quantity, keep: true, item: g.item_id ? itemsById.get(g.item_id) : undefined, raw: g, isNew: !g.item_id }))
    }
    rows = out
  })
  const title = $derived(kind === 'message' ? 'From your note' : kind === 'shelf_photo' ? `Seen in the ${location ?? 'photo'}` : kind === 'receipt' ? `Till slip${(result as ReceiptResult).shop ? ` · ${(result as ReceiptResult).shop}` : ''}` : kind === 'lunchbox' ? (mode === 'home' ? `${CHILD_NAME}'s box came home` : `${CHILD_NAME}'s box`) : kind === 'child_plate' ? `${CHILD_NAME}'s plate · ${(result as ChildPlateResult).description}` : (result as RecipeResult).title)
  const shelfAgree = $derived(kind === 'shelf_photo' ? rows.filter((r) => r.detail.startsWith('agrees')).length : 0)
  const shelfDiffer = $derived(kind === 'shelf_photo' ? rows.filter((r) => r.detail.startsWith('app')).length : 0)
  const shelfHidden = $derived(kind === 'shelf_photo' ? rows.filter((r) => r.detail.startsWith('partly')).length : 0)
  const crowded = $derived(kind === 'shelf_photo' && (result as ShelfResult).view === 'crowded')
  function trustShelf(all: boolean) {
    rows = rows.map((r) => ({ ...r, keep: all ? !!r.item || r.isNew : false }))
  }
  let childSlot = $state<MealSlotName>(hour < 10.5 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner')
  let childEaten = $state<'all' | 'most' | 'some' | 'little' | 'none' | null>(null)
  $effect(() => {
    if (kind === 'child_plate') childEaten = (result as ChildPlateResult).eaten ?? null
  })
  const EATEN = ['all', 'most', 'some', 'little', 'none'] as const
  const kept = $derived(rows.filter((r) => r.keep))

  async function ensureItem(name: string, unit = 'piece'): Promise<Item> {
    const item: Item = { id: newId(), household_id: household.id!, updated_at: '', deleted: false, name, aliases: [], category: 'pantry', location: location ?? 'pantry', unit, pack_size: 1, par_level: null, tracking_mode: 'count', preferred_shop: null, typical_price_zar: null, bulk_ok: false, source: 'bought', perishable_days: null, snackbox_ok: false, snack_component: null, kid_ok: true, archived: false }
    return put('item', item)
  }
  async function openTrip(): Promise<Trip> {
    const t = await db.trip.where('household_id').equals(household.id!).filter((x) => !x.deleted && x.status === 'open').first()
    return t ?? newTrip(null)
  }

  async function apply() {
    busy = true
    try {
      let n = 0
      if (kind === 'message') {
        for (const r of kept) {
          const raw = r.raw as MessageResult['events'][number] & { type?: string }
          const item = r.item ?? (await ensureItem(r.label))
          if (r.key.startsWith('e')) {
            const type = raw.type!
            await recordEvent(item, type, type === 'finished' ? 0 : (r.qty ?? 1), { source: 'text', note: raw.note ?? undefined })
          } else {
            const trip = await openTrip()
            await addLine(trip, { item_id: item.id, free_text: null, quantity: r.qty ?? 1, reason: 'manual', shop: item.preferred_shop, checked: false, price_paid_zar: null, event_id: null })
          }
          n++
        }
      } else if (kind === 'shelf_photo') {
        for (const r of kept) {
          const raw = r.raw as ShelfResult['items'][number]
          const item = r.item ?? (await ensureItem(r.label, raw.unit || 'piece'))
          await recordEvent(item, 'count', r.qty ?? 0, { source: 'photo' })
          n++
        }
      } else if (kind === 'receipt') {
        const rr = result as ReceiptResult
        for (const r of kept) {
          const item = r.item ?? (await ensureItem(r.label))
          await bought(item, r.qty ?? 1, r.price ?? null, 'shopping', rr.shop ?? undefined)
          n++
        }
        await saveReceiptRecord(rr.shop, rr.date, rr.total, rr.lines.length)
      } else if (kind === 'child_plate') {
        const rr = result as ChildPlateResult
        const ids = kept.map((r) => r.item?.id).filter((x): x is string => !!x)
        if (mode === 'after') {
          // Attach the verdict to today's most recent meal without one, else record a new meal.
          const open = childState.meals.find((m) => m.date === today && !m.eaten)
          if (open) await saveChildMeal({ ...open, eaten: childEaten, item_ids: [...new Set([...open.item_ids, ...ids])], notes: rr.notes ?? open.notes })
          else await newChildMeal(today, childSlot, { description: rr.description, item_ids: ids, eaten: childEaten, fruit_veg: rr.fruit_veg, protein: rr.protein, notes: rr.notes })
        } else {
          await newChildMeal(today, childSlot, { description: rr.description, item_ids: ids, fruit_veg: rr.fruit_veg, protein: rr.protein, notes: rr.notes })
        }
        n = 1
        showToast(mode === 'after' ? `${CHILD_NAME}: ${childEaten ?? 'noted'}` : `${CHILD_NAME}'s ${childSlot} logged`)
        onclose()
        ondone?.()
        return
      } else if (kind === 'lunchbox') {
        const existing = slotAt(planState.slots, today, 'school_snackbox')
        if (mode === 'home') {
          const base = existing ?? (await upsertSlot(undefined, today, 'school_snackbox', { item_ids: [] }))
          const verdicts: Record<string, Verdict> = { ...(base.item_verdicts ?? {}) }
          const ids = [...base.item_ids]
          for (const r of kept) {
            const it = r.raw as LunchboxResult['items'][number]
            if (!r.item) continue
            if (!ids.includes(r.item.id)) ids.push(r.item.id)
            verdicts[r.item.id] = it.state === 'gone' ? 'ate' : it.state === 'partly_eaten' ? 'some' : 'left'
            n++
          }
          const notes = (result as LunchboxResult).notes
          await saveSlot({ ...base, item_ids: ids, item_verdicts: verdicts, notes: notes ?? base.notes, status: base.status === 'cooked' ? 'cooked' : 'planned' })
        } else {
          const ids = kept.map((r) => r.item?.id).filter((x): x is string => !!x)
          const slot = await upsertSlot(existing, today, 'school_snackbox', { item_ids: [...new Set([...(existing?.item_ids ?? []), ...ids])] })
          if (slot.status !== 'cooked') await cookSlot(slot, null, [], itemsById)
          n = ids.length
        }
      } else {
        const rr = result as RecipeResult
        const recipe = await saveRecipe({ id: newId(), household_id: household.id!, updated_at: '', deleted: false, title: rr.title, servings: rr.servings ?? 3, prep_minutes: rr.prep_minutes, cook_minutes: rr.cook_minutes, steps: rr.steps || null, source_url: null, photo_path: null, tags: rr.tags.slice(0, 6), rating: {}, daughter_verdict: null })
        for (const r of kept) {
          const g = r.raw as RecipeResult['ingredients'][number]
          await saveIngredient({ ...blankIngredient(recipe.id), item_id: r.item?.id ?? null, free_text: r.item ? null : r.label, quantity: g.quantity, unit: g.unit, optional: g.optional })
          n++
        }
        if (kind === 'plate') {
          const existing = slotAt(planState.slots, today, mealSlot)
          const slot = await upsertSlot(existing, today, mealSlot, { recipe_id: recipe.id, free_text: null, servings: plates || rr.servings || 2, status: 'planned' })
          if (cookedNow) {
            const ings = ingredientsByRecipe(planState.ingredients).get(recipe.id) ?? (await db.recipe_ingredient.where('recipe_id').equals(recipe.id).toArray())
            await cookSlot(slot, recipe, ings, itemsById)
          }
          showToast(cookedNow ? `Logged as today's ${mealSlot} and deducted` : `Recipe saved and planned for ${mealSlot}`)
        } else {
          showToast(`Recipe saved with ${n} ingredients`)
        }
        onclose()
        ondone?.()
        go('recipe', recipe.id)
        return
      }
      showToast(`${n} ${kind === 'shelf_photo' ? 'counts' : 'entries'} recorded`)
      onclose()
      ondone?.()
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      busy = false
    }
  }
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-label={title}>
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <h2>{title}</h2>
    <button class="ghost" onclick={onclose}>Close</button>
  </div>
  <p class="muted" style="font-size:13px">Untick anything wrong. Rows marked new will be added to Stock.</p>
  {#if crowded}
    <p class="warnbox">This shelf is packed, so the camera can only see the front row. Counts here are a floor, not a total. Correct the numbers before you apply them.</p>
  {:else if shelfHidden}
    <p class="warnbox">{shelfHidden} item{shelfHidden === 1 ? ' is' : 's are'} partly hidden, so the count seen is lower than the real total. Those start unticked.</p>
  {/if}
  <div class="scroll">
    {#if rows.length === 0}
      <div class="empty">Nothing recognised. Try a closer, brighter photo.</div>
    {/if}
    {#each rows as r (r.key)}
      <label class="prow" class:off={!r.keep}>
        <input type="checkbox" bind:checked={r.keep} style="width:22px;height:22px" />
        <span style="flex:1">
          <span>{r.label}{r.isNew ? ' · new' : ''}</span>
          <span class="muted" style="display:block;font-size:12.5px">{r.detail}</span>
        </span>
        {#if r.qty !== null && kind !== 'message'}
          <input type="number" step="any" min="0" inputmode="decimal" bind:value={r.qty} class="qty" aria-label="Quantity" />
        {/if}
      </label>
    {/each}
    {#if kind === 'message' && (result as MessageResult).unmatched.length}
      <p class="muted" style="font-size:12.5px;margin-top:8px">Not understood: {(result as MessageResult).unmatched.join(' · ')}</p>
    {/if}
  </div>
  {#if kind === 'shelf_photo' && rows.length}
    <div class="row" style="margin-top:8px;flex-wrap:wrap">
      <span class="muted" style="font-size:12.5px">{shelfAgree} agree · {shelfDiffer} differ{shelfHidden ? ` · ${shelfHidden} partly hidden` : ''}</span>
      <button class="ghost chip" onclick={() => trustShelf(true)}>Trust the shelf for all</button>
      <button class="ghost chip" onclick={() => trustShelf(false)}>Keep the app for all</button>
    </div>
  {/if}
  {#if kind === 'child_plate'}
    <div class="card" style="margin-top:10px;padding:10px 12px">
      <p class="eyebrow" style="margin-bottom:6px">{mode === 'after' ? 'How much did she eat?' : 'Which meal?'}</p>
      {#if mode === 'after'}
        <div class="row" style="flex-wrap:wrap;gap:6px">{#each EATEN as e (e)}<button class="ghost chip" class:on={childEaten === e} onclick={() => (childEaten = e)}>{e}</button>{/each}</div>
      {:else}
        <div class="row" style="flex-wrap:wrap;gap:6px">{#each mealSlots as s (s.slot)}<button class="ghost chip" class:on={childSlot === s.slot} onclick={() => (childSlot = s.slot)}>{s.label}</button>{/each}</div>
      {/if}
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">{(result as ChildPlateResult).fruit_veg} fruit or veg · {(result as ChildPlateResult).protein ? 'protein present' : 'no clear protein'}{(result as ChildPlateResult).notes ? ` · ${(result as ChildPlateResult).notes}` : ''}</p>
    </div>
  {/if}
  {#if kind === 'plate'}
    <div class="card" style="margin-top:10px;padding:10px 12px">
      <p class="eyebrow" style="margin-bottom:6px">Log the meal</p>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">
        {#each mealSlots as s (s.slot)}<button class="ghost chip" class:on={mealSlot === s.slot} onclick={() => (mealSlot = s.slot)}>{s.label}</button>{/each}
      </div>
      <div class="row">
        <label class="row" style="margin:0;gap:6px">Plates <input type="number" min="1" inputmode="numeric" bind:value={plates} style="width:64px;padding:6px 8px" /></label>
        <label class="row" style="margin:0;gap:6px"><input type="checkbox" bind:checked={cookedNow} style="width:20px;height:20px" /> Cooked now, deduct</label>
      </div>
    </div>
  {/if}
  <div class="row" style="margin-top:12px">
    <button onclick={apply} disabled={busy || (!kept.length && kind !== 'child_plate')}>{busy ? 'Saving' : kind === 'plate' ? (cookedNow ? 'Save and log meal' : 'Save recipe') : kind === 'recipe_url' ? 'Save recipe' : kind === 'lunchbox' ? (mode === 'home' ? `Record ${kept.length} verdicts` : `Pack ${kept.length}`) : kind === 'child_plate' ? (mode === 'after' ? 'Record' : 'Log meal') : kind === 'shelf_photo' ? `Update ${kept.length}` : `Apply ${kept.length}`}</button>
    <button class="ghost" onclick={onclose}>Cancel</button>
  </div>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: rgb(0 0 0 / .35); z-index: 3; }
  .sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; background: var(--surface); border-radius: 16px 16px 0 0;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; max-height: 88vh; display: flex; flex-direction: column; }
  .scroll { overflow-y: auto; }
  .prow { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--rule-soft); margin: 0; font-size: 14.5px; color: var(--ink); }
  .prow.off { opacity: .5; }
  .qty { width: 70px; padding: 6px 8px; }
  .chip { padding: 6px 10px; font-size: 13px; }
  .chip.on { background: var(--moss); color: #fff; border-color: var(--moss); }
  .warnbox { background: var(--ochre-soft); color: var(--ink); border-radius: 8px; padding: 8px 10px; font-size: 13px; margin: 8px 0 0; }
</style>
