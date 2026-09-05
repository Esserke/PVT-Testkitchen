<script lang="ts">
  import { TABS, route, go } from '../lib/router.svelte'
</script>

<nav aria-label="Main">
  {#each TABS as t (t.path)}
    <button class:active={route.path === t.path} onclick={() => go(t.path)} aria-current={route.path === t.path ? 'page' : undefined}>
      {t.label}
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed; left: 0; right: 0; bottom: 0; height: calc(var(--tabbar) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    display: grid; grid-template-columns: repeat(5, 1fr);
    background: var(--surface); border-top: 1px solid var(--rule);
  }
  button {
    background: none; color: var(--muted); border: 0; border-radius: 0; padding: 0;
    font-size: 12.5px; font-weight: 500; position: relative;
  }
  button.active { color: var(--moss); }
  button.active::before {
    content: ''; position: absolute; top: 0; left: 25%; right: 25%; height: 2px; background: var(--moss);
  }
</style>
