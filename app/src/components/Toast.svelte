<script lang="ts">
  import { toast, hideToast } from '../lib/toast.svelte'
  async function undo() {
    const u = toast.undo
    hideToast()
    if (u) await u()
  }
</script>

{#if toast.message}
  <div class="toast" role="status">
    <span>{toast.message}</span>
    {#if toast.undo}<button onclick={undo}>Undo</button>{/if}
  </div>
{/if}

<style>
  .toast {
    position: fixed; left: 16px; right: 16px; bottom: calc(var(--tabbar) + env(safe-area-inset-bottom) + 12px); z-index: 5;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--ink); color: var(--ground); padding: 12px 16px; border-radius: 10px; font-size: 14.5px;
    max-width: 560px; margin: 0 auto;
  }
  button { background: transparent; color: var(--moss-soft); padding: 4px 8px; font-weight: 600; }
</style>
