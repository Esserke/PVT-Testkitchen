// Push the outbox to Supabase, then pull rows newer than the per-table cursor.
// Rows are append-only (stock_event) or last-write-wins (everything else), and
// the server stamps updated_at, so cursors stay monotonic across devices.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { db } from './schema'
import { SYNCED_TABLES, type SyncedTable } from './types'
import { supabase } from '../supabase'
import { auth } from '../auth.svelte'
import { household } from '../household.svelte'

export type SyncStatus = 'local' | 'idle' | 'syncing' | 'offline' | 'error' | 'signed-out'

export const sync = $state<{ status: SyncStatus; lastSync: string | null; pending: number; error: string | null; dropped: number }>({
  status: supabase ? 'signed-out' : 'local',
  lastSync: null,
  pending: 0,
  error: null,
  dropped: 0,
})

const REQUEST_TIMEOUT_MS = 20_000 // a single request on a flaky farm connection
const STUCK_AFTER_MS = 45_000 // a run older than this is abandoned and restarted
let runningSince = 0

const PAGE = 500
const EPOCH = '1970-01-01T00:00:00Z'
let timer: ReturnType<typeof setTimeout> | undefined
let running = false
let started = false
let channel: RealtimeChannel | null = null

export function scheduleSync(delayMs = 800): void {
  void refreshPending()
  if (!supabase) return
  clearTimeout(timer)
  timer = setTimeout(() => void runSync(), delayMs)
}

export async function refreshPending(): Promise<void> {
  sync.pending = await db.outbox.count()
}

export async function runSync(): Promise<void> {
  if (!supabase) return
  if (!auth.session || !household.id) {
    sync.status = 'signed-out'
    return
  }
  if (!navigator.onLine) {
    sync.status = 'offline'
    return
  }
  if (running && Date.now() - runningSince < STUCK_AFTER_MS) {
    scheduleSync(2000)
    return
  }
  running = true
  runningSince = Date.now()
  sync.status = 'syncing'
  try {
    await push()
    await pull(household.id)
    sync.status = 'idle'
    if (!sync.dropped) sync.error = null
    sync.lastSync = new Date().toISOString()
  } catch (e) {
    sync.status = 'error'
    sync.error = e instanceof Error ? e.message : String(e)
  } finally {
    running = false
    await refreshPending()
  }
}

// Errors the server will give again on every retry: the row can never be accepted as it is.
function isPermanent(error: { code?: string; message: string }): boolean {
  const c = error.code ?? ''
  return c === '23503' || c === '42501' || c === '23514' || c === '22P02' || c === 'PGRST204' || /violates|permission|policy|invalid input/i.test(error.message)
}

async function push(): Promise<void> {
  if (!supabase) return
  const entries = await db.outbox.orderBy('ts').toArray()
  if (!entries.length) return
  const byTable = new Map<SyncedTable, typeof entries>()
  for (const e of entries) byTable.set(e.table, [...(byTable.get(e.table) ?? []), e])

  for (const [table, list] of byTable) {
    const ids = list.map((e) => e.id!).filter((id) => id !== undefined)
    const rows = (await Promise.all(list.map((e) => db.synced(table).get(e.row_id)))).filter(Boolean)
    // Rows from a household this phone has left can never sync; let them go.
    const mine = rows.filter((r) => r.household_id === household.id)
    if (mine.length < rows.length) sync.dropped += rows.length - mine.length

    for (let i = 0; i < mine.length; i += 200) {
      const chunk = mine.slice(i, i + 200)
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' }).abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
      if (!error) continue
      if (!isPermanent(error)) throw new Error(`${table}: ${error.message}`)
      // One bad row must not block the rest: retry singly and drop the ones the server refuses.
      for (const row of chunk) {
        const single = await supabase.from(table).upsert(row, { onConflict: 'id' }).abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
        if (single.error && isPermanent(single.error)) {
          sync.dropped += 1
          sync.error = `${table}: ${single.error.message}`
        } else if (single.error) {
          throw new Error(`${table}: ${single.error.message}`)
        }
      }
    }
    await db.outbox.bulkDelete(ids)
  }
}

async function pull(householdId: string): Promise<void> {
  if (!supabase) return
  for (const table of SYNCED_TABLES) {
    const key = `cursor.${table}`
    let cursor = (await db.meta.get(key))?.value ?? EPOCH
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('household_id', householdId)
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(PAGE)
        .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
      if (error) throw new Error(`${table}: ${error.message}`)
      if (!data || data.length === 0) break
      const pendingIds = new Set((await db.outbox.where('table').equals(table).toArray()).map((e) => e.row_id))
      const fresh = data.filter((r) => !pendingIds.has(r.id))
      if (fresh.length) await db.synced(table).bulkPut(fresh)
      cursor = data[data.length - 1].updated_at
      await db.meta.put({ key, value: cursor })
      if (data.length < PAGE) break
    }
  }
}

export async function resetCursors(): Promise<void> {
  await db.meta.where('key').startsWith('cursor.').delete()
}

// Escape hatch: forget every change waiting to be sent. The rows stay on this phone.
export async function discardPending(): Promise<void> {
  await db.outbox.clear()
  sync.dropped = 0
  sync.error = null
  await refreshPending()
}

// Called once the household is known. Wires up online/visibility/interval and realtime.
export function startSync(): void {
  if (!supabase || started) return
  started = true
  window.addEventListener('online', () => scheduleSync(200))
  window.addEventListener('offline', () => (sync.status = 'offline'))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(200)
  })
  setInterval(() => scheduleSync(0), 60_000)
  subscribeRealtime()
  scheduleSync(0)
}

function subscribeRealtime(): void {
  if (!supabase || !household.id) return
  if (channel) void supabase.removeChannel(channel)
  let ch = supabase.channel(`household:${household.id}`)
  for (const table of SYNCED_TABLES) {
    ch = ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${household.id}` },
      () => scheduleSync(300),
    )
  }
  channel = ch.subscribe()
}
