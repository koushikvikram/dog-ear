import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { uid, go, useToast } from '../util.jsx'
import { enqueue, flush, insertHighlight, isNetworkError, queued } from '../offline.js'
import Highlights from '../components/Highlights.jsx'
import Characters from '../components/Characters.jsx'
import Lexicon from '../components/Lexicon.jsx'

const TABS = [['hl', 'Highlights'], ['chars', 'Characters'], ['words', 'Lexicon']]

export default function Book({ bookId }) {
  const [tab, setTab] = useState('hl')
  const d = useBookData(bookId)
  const [queuedN, setQueuedN] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)

  const refreshQueue = useCallback(() => queued().then(q => setQueuedN(q.length)), [])
  useEffect(() => {
    refreshQueue()
    const on = async () => { setOnline(true); await flush(); refreshQueue(); d.reload() }
    const off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [refreshQueue])  // eslint-disable-line

  if (d.error) return <main className="page"><p className="err" role="alert">{d.error}</p><p><a href="#/">Back to your books</a></p></main>
  if (!d.ready) return <main className="page"><p className="mute">Loading…</p></main>

  const offline = !online || queuedN > 0
  return (
    <>
      <div className="top" style={{ top: 57, background: 'var(--bg)', gap: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('/')} aria-label="Back to your books">← Books</button>
        <div className="grow" style={{ minWidth: 120 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.book.title}</div>
          {d.book.author && <div className="mute" style={{ fontSize: 12 }}>{d.book.author}</div>}
        </div>
        <span className={'sync' + (offline ? ' off' : '')} role="status">{offline ? `Offline${queuedN ? ' · ' + queuedN + ' waiting' : ''}` : 'Saved'}</span>
        <nav className="btabs" aria-label="Book sections">
          {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </nav>
      </div>
      <main className="page">
        {tab === 'hl' && <Highlights d={d} onQueued={refreshQueue} />}
        {tab === 'chars' && <Characters d={d} />}
        {tab === 'words' && <Lexicon d={d} />}
      </main>
    </>
  )
}

/* ---------------- data + optimistic mutations ---------------- */
function useBookData(bookId) {
  const toast = useToast()
  const [s, setS] = useState({ ready: false, error: '', book: null, tieTypes: [], characters: [], ties: [], labels: [], highlights: [], words: null })
  const alive = useRef(true)
  const pos = useRef({ t: null, pend: {} })
  const latest = useRef(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const set = patch => alive.current && setS(x => ({ ...x, ...(typeof patch === 'function' ? patch(x) : patch) }))

  const reload = useCallback(async () => {
    const q = t => supabase.from(t).select('*').eq('book_id', bookId)
    const [b, tt, ch, ti, lb, hl] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).is('deleted_at', null).maybeSingle(),
      q('tie_types').order('name'), q('characters').order('name'), q('ties'),
      q('highlight_labels').order('sort'),
      supabase.from('highlights').select('*, highlight_characters(character_id)').eq('book_id', bookId).order('created_at', { ascending: false }),
    ])
    const fail = [b, tt, ch, ti, lb, hl].find(r => r.error)
    if (fail) return set({ error: 'Could not load this book. ' + fail.error.message })
    if (!b.data) return set({ error: 'That book was not found. It may have been deleted.' })
    // keep any locally queued (not yet sent) highlights visible
    const pending = (await queued()).filter(o => o.row.book_id === bookId).map(o => ({ ...o.row, created_at: o.row.created_at, mentions: o.charIds, pending: true }))
    const server = hl.data.map(h => ({ ...h, mentions: (h.highlight_characters || []).map(x => x.character_id) }))
    const ids = new Set(server.map(h => h.id))
    set({ ready: true, error: '', book: b.data, tieTypes: tt.data, characters: ch.data, ties: ti.data, labels: lb.data,
      highlights: pending.filter(p => !ids.has(p.id)).concat(server) })
  }, [bookId])  // eslint-disable-line
  useEffect(() => { reload() }, [reload])

  // report a failed write inline via the returned message; callers show it in red
  const run = async (promise) => { const { error } = await promise; return error ? error.message : '' }

  // Deleting waits ~6s so Undo can cancel before anything is sent.
  const deferDelete = (message, hide, restore, commit) => {
    hide()
    toast(message, { undo: restore, commit: async () => { const e = await commit(); if (e) { restore(); } }, ms: 6000 })
  }

  const api = {
    ...s, reload,

    /* highlights */
    async addHighlight({ page, note, quote, labelId, mentions }) {
      const row = { id: uid(), book_id: bookId, page: Number(page), note: note || null, quote: quote || null, label_id: labelId || null, created_at: new Date().toISOString() }
      const local = { ...row, mentions }
      set(x => ({ highlights: [local, ...x.highlights] }))
      try { await insertHighlight(row, mentions); return { ok: true } }
      catch (e) {
        if (isNetworkError(e)) { await enqueue({ id: row.id, row, charIds: mentions }); set(x => ({ highlights: x.highlights.map(h => h.id === row.id ? { ...h, pending: true } : h) })); return { ok: true, queued: true } }
        set(x => ({ highlights: x.highlights.filter(h => h.id !== row.id) }))
        return { ok: false, message: e.message }
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
      const row = { id: uid(), book_id: bookId, name, color_index: s.labels.length % 8, sort: s.labels.length }
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
      deferDelete('Label removed' + (affected.length ? ': ' + affected.length + ' highlights are now Unlabelled' : ''),
        () => set(x => ({ labels: x.labels.filter(y => y.id !== l.id), highlights: x.highlights.map(h => h.label_id === l.id ? { ...h, label_id: null } : h) })),
        () => set(x => ({ labels: [...x.labels, l].sort((a, b) => a.sort - b.sort), highlights: x.highlights.map(h => affected.includes(h.id) ? { ...h, label_id: l.id } : h) })),
        () => run(supabase.from('highlight_labels').delete().eq('id', l.id)))
    },

    /* characters */
    async addCharacter(c) {
      const row = { id: uid(), book_id: bookId, x: 0, y: 0, ...c }
      // drop it near the middle of what is already drawn
      const n = s.characters.length
      row.x = 200 + (n % 4) * 150; row.y = 120 + Math.floor(n / 4) * 120
      set(x => ({ characters: [...x.characters, row] }))
      const err = await run(supabase.from('characters').insert(row))
      if (err) set(x => ({ characters: x.characters.filter(y => y.id !== row.id) }))
      return err ? { err } : { id: row.id }
    },
    async updateCharacter(id, patch) {
      const prev = s.characters.find(c => c.id === id)
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
          return c && { ...c, x: xy.x, y: xy.y }
        }).filter(Boolean)
        if (rows.length) await supabase.from('characters').upsert(rows, { onConflict: 'id' })
      }, 600)
    },
    removeCharacter(c) {
      const gone = s.ties.filter(t => t.from_character_id === c.id || t.to_character_id === c.id)
      const mentions = s.highlights.filter(h => h.mentions?.includes(c.id)).map(h => h.id)
      deferDelete('Removed ' + c.name + (gone.length ? ' and ' + gone.length + ' tie' + (gone.length > 1 ? 's' : '') : ''),
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
      const prev = s.ties.find(t => t.id === id)
      set(x => ({ ties: x.ties.map(t => t.id === id ? { ...t, ...patch } : t) }))
      const err = await run(supabase.from('ties').update(patch).eq('id', id))
      if (err) set(x => ({ ties: x.ties.map(t => t.id === id ? prev : t) }))
      return err
    },
    removeTie(t) {
      deferDelete('Tie removed',
        () => set(x => ({ ties: x.ties.filter(y => y.id !== t.id) })),
        () => set(x => ({ ties: [...x.ties, t] })),
        () => run(supabase.from('ties').delete().eq('id', t.id)))
    },

    /* tie types */
    async addTieType(name) {
      const row = { id: uid(), book_id: bookId, name, color_index: s.tieTypes.length % 8 }
      set(x => ({ tieTypes: [...x.tieTypes, row] }))
      const err = await run(supabase.from('tie_types').insert(row))
      if (err) set(x => ({ tieTypes: x.tieTypes.filter(t => t.id !== row.id) }))
      return err
    },
    async updateTieType(id, patch) {
      const prev = s.tieTypes.find(t => t.id === id)
      set(x => ({ tieTypes: x.tieTypes.map(t => t.id === id ? { ...t, ...patch } : t) }))
      const err = await run(supabase.from('tie_types').update(patch).eq('id', id))
      if (err) set(x => ({ tieTypes: x.tieTypes.map(t => t.id === id ? prev : t) }))
      return err
    },
    removeTieType(tt) {
      const affected = s.ties.filter(t => t.tie_type_id === tt.id).map(t => t.id)
      deferDelete('Tie type removed' + (affected.length ? ': ' + affected.length + ' ties are now Untyped' : ''),
        () => set(x => ({ tieTypes: x.tieTypes.filter(t => t.id !== tt.id), ties: x.ties.map(t => affected.includes(t.id) ? { ...t, tie_type_id: null } : t) })),
        () => set(x => ({ tieTypes: [...x.tieTypes, tt], ties: x.ties.map(t => affected.includes(t.id) ? { ...t, tie_type_id: tt.id } : t) })),
        () => run(supabase.from('tie_types').delete().eq('id', tt.id)))
    },

    /* words */
    async loadWords() {
      if (s.words) return
      const { data, error } = await supabase.from('words').select('*').eq('book_id', bookId).order('word')
      set({ words: error ? [] : data })
      return error ? error.message : ''
    },
    async addWord(word) {
      if ((s.words || []).some(w => w.word.toLowerCase() === word.toLowerCase())) return 'That word is already in your list.'
      const row = { id: uid(), book_id: bookId, word, created_at: new Date().toISOString() }
      set(x => ({ words: [...(x.words || []), row].sort((a, b) => a.word.localeCompare(b.word)) }))
      const err = await run(supabase.from('words').insert(row))
      if (err) set(x => ({ words: x.words.filter(w => w.id !== row.id) }))
      return err
    },
    removeWord(w) {
      deferDelete('Removed “' + w.word + '”',
        () => set(x => ({ words: x.words.filter(y => y.id !== w.id) })),
        () => set(x => ({ words: [...x.words, w].sort((a, b) => a.word.localeCompare(b.word)) })),
        () => run(supabase.from('words').delete().eq('id', w.id)))
    },
  }
  latest.current = s
  return api
}
