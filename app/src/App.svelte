<script lang="ts">
  import { supabase } from './lib/supabase'
  import { auth } from './lib/auth.svelte'
  import { household, resolveHousehold } from './lib/household.svelte'
  import { startSync } from './lib/db/sync.svelte'
  import { route } from './lib/router.svelte'
  import TabBar from './components/TabBar.svelte'
  import SyncBadge from './components/SyncBadge.svelte'
  import SignIn from './components/SignIn.svelte'
  import HouseholdSetup from './components/HouseholdSetup.svelte'
  import Today from './routes/Today.svelte'
  import Stock from './routes/Stock.svelte'
  import Plan from './routes/Plan.svelte'
  import Recipes from './routes/Recipes.svelte'
  import Shop from './routes/Shop.svelte'
  import Settings from './routes/Settings.svelte'
  import ItemDetail from './routes/ItemDetail.svelte'
  import RecipeEdit from './routes/RecipeEdit.svelte'
  import Insights from './routes/Insights.svelte'
  import Faye from './routes/Faye.svelte'
  import Labels from './routes/Labels.svelte'
  import QuickScan from './routes/QuickScan.svelte'
  import { CHILD_NAME } from './lib/constants'
  import { watchPlan } from './lib/planState.svelte'
  import { watchChild } from './lib/childState.svelte'
  import Toast from './components/Toast.svelte'
  import { watchStock } from './lib/stockState.svelte'

  // When a session appears, find the household this user belongs to; then start syncing.
  $effect(() => {
    if (supabase && auth.session) void resolveHousehold()
  })
  $effect(() => {
    if (supabase && auth.session && household.id) startSync()
  })

  $effect(() => {
    const id = supabase && !auth.session ? null : household.id
    watchStock(id)
    watchPlan(id)
    watchChild(id)
  })

  const title = $derived(
    route.path === 'settings' ? 'Settings' : route.path === 'item' ? 'Item' : route.path === 'recipe' ? 'Recipe' : route.path === 'insights' ? 'Insights' : route.path === 'faye' ? CHILD_NAME : route.path === 'labels' ? 'Labels' : route.path === 'quick' ? 'Quick' : route.path.charAt(0).toUpperCase() + route.path.slice(1),
  )
</script>

{#if supabase && !auth.ready}
  <div class="page empty">Loading</div>
{:else if supabase && !auth.session}
  <SignIn />
{:else if supabase && !household.id}
  {#if household.loading}
    <div class="page empty">Finding your household</div>
  {:else}
    <HouseholdSetup />
  {/if}
{:else}
  <header>
    <a href="#/settings" class="brand" aria-label="Settings">Larder</a>
    <h1>{title}</h1>
    <SyncBadge />
  </header>
  <main>
    {#if route.path === 'today'}<Today />
    {:else if route.path === 'stock'}<Stock />
    {:else if route.path === 'plan'}<Plan />
    {:else if route.path === 'recipes'}<Recipes />
    {:else if route.path === 'shop'}<Shop />
    {:else if route.path === 'settings'}<Settings />
    {:else if route.path === 'item'}<ItemDetail />
    {:else if route.path === 'recipe'}<RecipeEdit />
    {:else if route.path === 'insights'}<Insights />
    {:else if route.path === 'faye'}<Faye />
    {:else if route.path === 'labels'}<Labels />
    {:else if route.path === 'quick'}<QuickScan />
    {/if}
  </main>
  <TabBar />
  <Toast />
{/if}

<style>
  header {
    position: sticky; top: 0; z-index: 2;
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px;
    padding: 12px 16px; background: var(--ground); border-bottom: 1px solid var(--rule-soft);
  }
  .brand { font: 500 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); text-decoration: none; }
  h1 { font-size: 18px; }
</style>
