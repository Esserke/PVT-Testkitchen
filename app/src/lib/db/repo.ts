// Local-first writes. Every write goes to IndexedDB immediately and is queued in
// the outbox; sync.ts pushes the outbox when online.
import { db } from './schema'
import type { Synced, SyncedTable } from './types'
import { scheduleSync } from './sync.svelte'

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export async function put<T extends Synced>(table: SyncedTable, row: T): Promise<T> {
  const stamped = { ...row, updated_at: nowIso() }
  await db.transaction('rw', db.synced(table), db.outbox, async () => {
    await db.synced(table).put(stamped)
    await db.outbox.where('[table+row_id]').equals([table, row.id]).delete()
    await db.outbox.add({ table, row_id: row.id, ts: Date.now() })
  })
  scheduleSync()
  return stamped
}

export async function softDelete(table: SyncedTable, id: string): Promise<void> {
  const row = await db.synced(table).get(id)
  if (!row) return
  await put(table, { ...row, deleted: true })
}

export async function clearLocalData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}
