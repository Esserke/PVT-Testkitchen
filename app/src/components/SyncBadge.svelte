<script lang="ts">
  import { sync, runSync } from '../lib/db/sync.svelte'
  import { go } from '../lib/router.svelte'

  const label = $derived(
    sync.status === 'local' ? 'This device only'
    : sync.status === 'syncing' ? 'Syncing'
    : sync.status === 'offline' ? `Offline${sync.pending ? ` · ${sync.pending} waiting` : ''}`
    : sync.status === 'error' ? 'Sync problem'
    : sync.status === 'signed-out' ? 'Not signed in'
    : sync.pending ? `${sync.pending} waiting` : 'Synced',
  )
  const tone = $derived(sync.status === 'error' ? 'bad' : sync.status === 'offline' || sync.pending ? 'warn' : '')
</script>

<button class="pill {tone}" onclick={() => (sync.status === 'error' || sync.status === 'local' ? go('settings') : runSync())} title={sync.error ?? ''}>
  {label}
</button>

<style>
  button { border: 0; cursor: pointer; }
</style>
