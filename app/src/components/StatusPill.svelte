<script lang="ts">
  import type { StockStatus } from '../lib/domain/stock'
  let { status }: { status: StockStatus } = $props()
</script>

{#if status === 'out'}<span class="pill bad">out</span>
{:else if status === 'low'}<span class="pill warn">low</span>
{:else if status === 'ok'}<span class="pill">ok</span>
{:else}<span class="pill" style="background:var(--rule-soft);color:var(--muted)">?</span>{/if}
