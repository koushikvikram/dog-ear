// Tiny IndexedDB queue for highlights captured with no signal.
// Rows carry client-made UUIDs, so a retried flush is an upsert and never a duplicate.
import { supabase } from './supabase.js'

const DB = 'dogear', STORE = 'queue'
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const tx = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s)
    t.oncomplete = () => res(out && out.result)
    t.onerror = () => rej(t.error)
  })
}
export const queued = () => tx('readonly', s => s.getAll()).catch(() => [])
export const enqueue = op => tx('readwrite', s => s.put(op))
const drop = id => tx('readwrite', s => s.delete(id))

export const isNetworkError = e =>
  !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message || '')

export async function insertHighlight(row, charIds) {
  const { error } = await supabase.from('highlights').upsert(row, { onConflict: 'id' })
  if (error) throw error
  if (charIds.length) {
    const { error: e2 } = await supabase.from('highlight_characters').upsert(
      charIds.map(character_id => ({ highlight_id: row.id, character_id })),
      { onConflict: 'highlight_id,character_id', ignoreDuplicates: true })
    if (e2) throw e2
  }
}

// Sends everything waiting. Returns { sent, left }.
export async function flush() {
  let sent = 0
  for (const op of await queued()) {
    try { await insertHighlight(op.row, op.charIds); await drop(op.id); sent++ }
    catch (e) {
      if (isNetworkError(e)) break
      await drop(op.id) // a permanent rejection (e.g. the book was deleted): do not retry forever
    }
  }
  return { sent, left: (await queued()).length }
}
