<script lang="ts">
  // Derived stock over time: one series, area fill, faint baseline, emphasised endpoint.
  let { points, par = null, height = 48 }: { points: { date: string; stock: number | null }[]; par?: number | null; height?: number } = $props()
  const W = 240
  const PAD = 4
  const vals = $derived(points.map((p) => p.stock).filter((v): v is number => v !== null))
  const max = $derived(Math.max(1, ...vals, par ?? 0))
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - 2 * PAD)
  const y = (v: number) => height - PAD - (v / max) * (height - 2 * PAD)
  const path = $derived.by(() => {
    let d = ''
    points.forEach((p, i) => {
      if (p.stock === null) return
      d += (d ? ' L' : 'M') + `${x(i).toFixed(1)} ${y(p.stock).toFixed(1)}`
    })
    return d
  })
  const first = $derived(points.findIndex((p) => p.stock !== null))
  const lastIdx = $derived(points.length - 1)
  const area = $derived(path && first >= 0 ? `${path} L${x(lastIdx).toFixed(1)} ${(height - PAD).toFixed(1)} L${x(first).toFixed(1)} ${(height - PAD).toFixed(1)} Z` : '')
  const last = $derived(points[lastIdx]?.stock ?? null)
</script>

{#if path}
  <svg viewBox="0 0 {W} {height}" width="100%" height={height} role="img" aria-label="Stock over the last {points.length} days">
    <line x1={PAD} x2={W - PAD} y1={height - PAD} y2={height - PAD} stroke="var(--rule)" stroke-width="1" />
    {#if par != null && par > 0}
      <line x1={PAD} x2={W - PAD} y1={y(par)} y2={y(par)} stroke="var(--ochre)" stroke-width="1" stroke-dasharray="3 3" />
    {/if}
    <path d={area} fill="var(--moss)" opacity=".12" />
    <path d={path} fill="none" stroke="var(--moss)" stroke-width="2" stroke-linejoin="round" />
    {#if last !== null}<circle cx={x(lastIdx)} cy={y(last)} r="4" fill="var(--moss)" stroke="var(--surface)" stroke-width="2" />{/if}
  </svg>
{:else}
  <p class="muted" style="font-size:12.5px">No stock history yet.</p>
{/if}
