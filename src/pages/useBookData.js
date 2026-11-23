import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { uid, useToast } from '../util.jsx'
import { enqueue, insertHighlight, isNetworkError, queued } from '../offline.js'
import { LABEL_COLORS, TIE_COLORS } from '../ui/palette.js'

// First colour index not used yet, else the next one round the palette.
const nextIndex = (used, size) => { for (let i = 0; i < size; i++) if (!used.includes(i)) return i; return used.length % size }

/* Everything under one book, with optimistic writes. Callers show a returned error string inline.
   Deletes wait ~6s behind an Undo toast before the request is sent. */
export function useBookData(bookId) {
  const toast = useToast()
  const [s, setS] = useState({ ready: false, error: '', book: null, tieTypes: [], characters: [], ties: [], labels: [], highlights: [], words: [] })
  const alive = useRef(true)
  const pos = useRef({ t: null, pend: {} })
  const latest = useRef(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const set = patch => alive.current && setS(x => ({ ...x, ...(typeof patch === 'function' ? patch(x) : patch) }))

  const reload = useCallback(async () => {
    const q = t => supabase.from(t).select('*').eq('book_id', bookId)
    let res
    try {
      res = await Promise.all([
        supabase.from('books').select('*').eq('id', bookId).is('deleted_at', null).maybeSingle(),
        q('tie_types').order('name'), q('characters').order('name'), q('ties'),
        q('highlight_labels').order('sort'),
        supabase.from('highlights').select('*, highlight_characters(character_id)').eq('book_id', bookId).order('created_at', { ascending: false }),
        q('words').order('created_at', { ascending: false }),
      ])
    } catch { return set({ error: 'Could not load this book. Check your connection and try again.' }) }
    const [b, tt, ch, ti, lb, hl, wd] = res
    const fail = res.find(r => r.error)
    if (fail) return set({ error: 'Could not load this book. Check your connection and try again.' })
    if (!b.data) return set({ error: 'That book was not found. It may have been deleted.' })
    // keep any locally queued (not yet sent) highlights visible
    const pending = (await queued()).filter(o => o.row.book_id === bookId).map(o => ({ ...o.row, mentions: o.charIds, pending: true }))
    const server = hl.data.map(h => ({ ...h, mentions: (h.highlight_characters || []).map(x => x.character_id) }))
    const ids = new Set(server.map(h => h.id))
    set({ ready: true, error: '', book: b.data, tieTypes: tt.data, characters: ch.data, ties: ti.data, labels: lb.data,
      highlights: pending.filter(p => !ids.has(p.id)).concat(server), words: wd.data })
  }, [bookId])  // eslint-disable-line
  useEffect(() => {
    reload()
    supabase.from('books').update({ last_opened_at: new Date().toISOString() }).eq('id', bookId).then(() => {}, () => {})
  }, [reload, bookId])

  // report a failed write inline via the returned message
  const run = async (promise) => {
    try { const { error } = await promise; return error ? (isNetworkError(error) ? 'You are offline. Try again when you are back online.' : 'Could not save that. Try again in a moment.') : '' }
    catch { return 'You are offline. Try again when you are back online.' }
  }

  // Deleting waits ~6s so Undo can cancel before anything is sent.
  const deferDelete = (message, hide, restore, commit) => {
    hide()
    toast(message, { undo: restore, commit: async () => { const e = await commit(); if (e) restore() }, ms: 6000 })
  }

  const api = {
    ...s, reload,

    /* book */
    async updateBook(patch) {
      const prev = s.book
      set(x => ({ book: { ...x.book, ...patch } }))
      const err = await run(supabase.from('books').update(patch).eq('id', bookId))
      if (err) set({ book: prev })
      return err
    },

    /* highlights */
    async addHighlight({ page, note, quote, labelId, mentions }) {
      const row = { id: uid(), book_id: bookId, page: Number(page), note: note || null, quote: quote || null, label_id: labelId || null, created_at: new Date().toISOString() }
      set(x => ({ highlights: [{ ...row, mentions }, ...x.highlights] }))
      try { await insertHighlight(row, mentions); return { ok: true } }
      catch (e) {
        if (isNetworkError(e)) { await enqueue({ id: row.id, row, charIds: mentions }); set(x => ({ highlights: x.highlights.map(h => h.id === row.id ? { ...h, pending: true } : h) })); return { ok: true, queued: true } }
        set(x => ({ highlights: x.highlights.filter(h => h.id !== row.id) }))
        return { ok: false, message: 'Could not save the highlight. Try again in a moment.' }
      }
    },
    async updateHighlight(id, patch, mentions) {
      const prev = s.highlights.find(h => h.id === id)
      set(x => ({ highlights: x.highlights.map(h => h.id === id ? { ...h, ...patch, mentions } : h) }))
      let err = await run(supabase.from('highlights').update(patch).eq('id', id))
      if (!err) {
        err = await run(supabase.from('highlight_characters').delete().eq('highlight_id', id))
        if (!err && mentions.length) err = await run(supabase.from('highlight_characters').insert(mentions.map(character_id => ({ highlight_id: id, character_id }))))
      }
      if (err) set(x => ({ highlights: x.highlights.map(h => h.id === id ? prev : h) }))
      return err
    },
    removeHighlight(h) {
      deferDelete('Highlight removed',
        () => set(x => ({ highlights: x.highlights.filter(y => y.id !== h.id) })),
        () => set(x => ({ highlights: [h, ...x.highlights].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)) })),
        () => run(supabase.from('highlights').delete().eq('id', h.id)))
    },

    /* labels */
    async addLabel(name) {
      const row = { id: uid(), book_id: bookId, name, color_index: nextIndex(s.labels.map(l => l.color_index), LABEL_COLORS.length), sort: s.labels.reduce((m, l) => Math.max(m, l.sort + 1), 0) }
      set(x => ({ labels: [...x.labels, row] }))
      const err = await run(supabase.from('highlight_labels').insert(row))
      if (err) set(x => ({ labels: x.labels.filter(l => l.id !== row.id) }))
      return err
    },
    async updateLabel(id, patch) {
      const prev = s.labels.find(l => l.id === id)
      set(x => ({ labels: x.labels.map(l => l.id === id ? { ...l, ...patch } : l) }))
      const err = await run(supabase.from('highlight_labels').update(patch).eq('id', id))
      if (err) set(x => ({ labels: x.labels.map(l => l.id === id ? prev : l) }))
      return err
    },
    removeLabel(l) {
      const affected = s.highlights.filter(h => h.label_id === l.id).map(h => h.id)
      deferDelete('“' + l.name + '” label removed',
        () => set(x => ({ labels: x.labels.filter(y => y.id !== l.id), highlights: x.highlights.map(h => h.label_id === l.id ? { ...h, label_id: null } : h) })),
        () => set(x => ({ labels: [...x.labels, l].sort((a, b) => a.sort - b.sort), highlights: x.highlights.map(h => affected.includes(h.id) ? { ...h, label_id: l.id } : h) })),
        () => run(supabase.from('highlight_labels').delete().eq('id', l.id)))
    },

    /* characters */
    async addCharacter(c, at) {
      const n = s.characters.length
      const row = { id: uid(), book_id: bookId, aliases: [], ...c, x: Math.round(at?.x ?? 200 + (n % 4) * 220), y: Math.round(at?.y ?? 120 + Math.floor(n / 4) * 120) }
      set(x => ({ characters: [...x.characters, row] }))
      const err = await run(supabase.from('characters').insert(row))
      if (err) set(x => ({ characters: x.characters.filter(y => y.id !== row.id) }))
      return err ? { err } : { id: row.id }
    },
    async updateCharacter(id, patch) {
      const prev = latest.current.characters.find(c => c.id === id)
      set(x => ({ characters: x.characters.map(c => c.id === id ? { ...c, ...patch } : c) }))
      const err = await run(supabase.from('characters').update(patch).eq('id', id))
      if (err) set(x => ({ characters: x.characters.map(c => c.id === id ? prev : c) }))
      return err
    },
    // positions are applied locally while dragging; one batched upsert ~600ms after the last move
    setPositions(moves) {
      set(x => ({ characters: x.characters.map(c => moves[c.id] ? { ...c, ...moves[c.id] } : c) }))
      const p = pos.current
      clearTimeout(p.t); p.pend = { ...p.pend, ...moves }
      p.t = setTimeout(async () => {
        const pend = p.pend; p.pend = {}
        const rows = Object.entries(pend).map(([id, xy]) => {
          const c = latest.current.characters.find(y => y.id === id)
          return c && { ...c, x: Math.round(xy.x), y: Math.round(xy.y) }
        }).filter(Boolean)
        if (rows.length) await supabase.from('characters').upsert(rows, { onConflict: 'id' }).then(() => {}, () => {})
      }, 600)
    },
    removeCharacter(c) {
      const gone = s.ties.filter(t => t.from_character_id === c.id || t.to_character_id === c.id)
      const mentions = s.highlights.filter(h => h.mentions?.includes(c.id)).map(h => h.id)
      deferDelete(c.name + ' removed',
        () => set(x => ({ characters: x.characters.filter(y => y.id !== c.id), ties: x.ties.filter(t => !gone.includes(t)), highlights: x.highlights.map(h => h.mentions?.includes(c.id) ? { ...h, mentions: h.mentions.filter(m => m !== c.id) } : h) })),
        () => set(x => ({ characters: [...x.characters, c], ties: [...x.ties, ...gone], highlights: x.highlights.map(h => mentions.includes(h.id) ? { ...h, mentions: [...(h.mentions || []), c.id] } : h) })),
        () => run(supabase.from('characters').delete().eq('id', c.id)))
    },

    /* ties */
    async addTie(from, to, tie_type_id, label = '') {
      const row = { id: uid(), book_id: bookId, from_character_id: from, to_character_id: to, tie_type_id: tie_type_id || null, label }
      set(x => ({ ties: [...x.ties, row] }))
      const err = await run(supabase.from('ties').insert(row))
      if (err) set(x => ({ ties: x.ties.filter(t => t.id !== row.id) }))
      return err ? { err } : { id: row.id }
    },
    async updateTie(id, patch) {
      const prev = latest.current.ties.find(t => t.id === id)
      set(x => ({ ties: x.ties.map(t => t.id === id ? { ...t, ...patch } : t) }))
      const err = await run(supabase.from('ties').update(patch).eq('id', id))
      if (err) set(x => ({ ties: x.ties.map(t => t.id === id ? prev : t) }))
      return err
    },
    removeTie(t, { quiet } = {}) {
      if (quiet) { // a tie the reader just drew and cancelled: no Undo needed
        set(x => ({ ties: x.ties.filter(y => y.id !== t.id) }))
        return run(supabase.from('ties').delete().eq('id', t.id))
      }
      deferDelete('Tie removed',
        () => set(x => ({ ties: x.ties.filter(y => y.id !== t.id) })),
        () => set(x => ({ ties: [...x.ties, t] })),
        () => run(supabase.from('ties').delete().eq('id', t.id)))
    },

    /* tie types */
    async addTieType(name) {
      const row = { id: uid(), book_id: bookId, name, color_index: nextIndex(s.tieTypes.map(t => t.color_index), TIE_COLORS.length) }
      set(x => ({ tieTypes: [...x.tieTypes, row] }))
      const err = await run(supabase.from('tie_types').insert(row))
      if (err) set(x => ({ tieTypes: x.tieTypes.filter(t => t.id !== row.id) }))
      return err
    },
    async updateTieType(id, patch) {
      const prev = latest.current.tieTypes.find(t => t.id === id)
      set(x => ({ tieTypes: x.tieTypes.map(t => t.id === id ? { ...t, ...patch } : t) }))
      const err = await run(supabase.from('tie_types').update(patch).eq('id', id))
      if (err) set(x => ({ tieTypes: x.tieTypes.map(t => t.id === id ? prev : t) }))
      return err
    },
    removeTieType(tt) {
      const affected = s.ties.filter(t => t.tie_type_id === tt.id).map(t => t.id)
      deferDelete('“' + tt.name + '” removed' + (affected.length ? '. Its ties are now Untyped.' : ''),
        () => set(x => ({ tieTypes: x.tieTypes.filter(t => t.id !== tt.id), ties: x.ties.map(t => affected.includes(t.id) ? { ...t, tie_type_id: null } : t) })),
        () => set(x => ({ tieTypes: [...x.tieTypes, tt], ties: x.ties.map(t => affected.includes(t.id) ? { ...t, tie_type_id: tt.id } : t) })),
        () => run(supabase.from('tie_types').delete().eq('id', tt.id)))
    },
    // Copy the tie types another book has and this one lacks (by name). Returns { n } or { err }.
    async copyTieTypes(fromBookId) {
      const { data, error } = await supabase.from('tie_types').select('*').eq('book_id', fromBookId).then(r => r, () => ({ error: true }))
      if (error) return { err: 'Could not read that book’s tie types. Try again in a moment.' }
      const have = s.tieTypes.map(t => t.name.toLowerCase())
      const rows = data.filter(t => !have.includes(t.name.toLowerCase())).map(t => ({ id: uid(), book_id: bookId, name: t.name, color_index: t.color_index }))
      if (!rows.length) return { n: 0 }
      set(x => ({ tieTypes: [...x.tieTypes, ...rows] }))
      const err = await run(supabase.from('tie_types').insert(rows))
      if (err) { const ids = rows.map(r => r.id); set(x => ({ tieTypes: x.tieTypes.filter(t => !ids.includes(t.id)) })); return { err } }
      return { n: rows.length }
    },

    /* words */
    async addWord(word) {
      if (s.words.some(w => w.word.toLowerCase() === word.toLowerCase())) return 'That word is already in your list.'
      const row = { id: uid(), book_id: bookId, word, created_at: new Date().toISOString() }
      set(x => ({ words: [row, ...x.words] }))
      const err = await run(supabase.from('words').insert(row))
      if (err) set(x => ({ words: x.words.filter(w => w.id !== row.id) }))
      return err
    },
    removeWord(w) {
      deferDelete('“' + w.word + '” removed',
        () => set(x => ({ words: x.words.filter(y => y.id !== w.id) })),
        () => set(x => ({ words: [...x.words, w].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)) })),
        () => run(supabase.from('words').delete().eq('id', w.id)))
    },
  }
  latest.current = s
  return api
}
