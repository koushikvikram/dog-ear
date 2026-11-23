import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  Button, EmptyState, ErrorText, Eyebrow, Icon, MicButton, Note, Panel, SearchField, Suggestion, WordCard, WordEntry,
} from '../design-system/index.js'
import { useDictation, useToast } from '../util.jsx'
import { FormOverlay } from '../ui/overlays.jsx'

// Shared cache first, then the free dictionary API, then save the result for next time.
async function lookup(raw) {
  const w = raw.trim().toLowerCase()
  const { data } = await supabase.from('dictionary').select('entry').eq('word', w).maybeSingle()
  if (data) return data.entry
  const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w))
  if (r.status === 404) return null
  if (!r.ok) throw new Error('lookup failed')
  const j = await r.json()
  const entry = {
    word: j[0].word, phonetic: j[0].phonetic || (j[0].phonetics || []).map(p => p.text).find(Boolean) || '',
    meanings: (j[0].meanings || []).slice(0, 4).map(m => ({ pos: m.partOfSpeech, defs: (m.definitions || []).slice(0, 2).map(d => ({ d: d.definition, e: d.example || '' })) })),
  }
  supabase.rpc('cache_definition', { p_word: w, p_entry: entry }).then(() => {}, () => {}) // fire and forget
  return entry
}

const norm = q => q.trim().toLowerCase()
const spoken = t => t.toLowerCase().replace(/[^a-z' -]/g, '').trim().split(/\s+/).slice(0, 2).join(' ')
const escapeLike = s => s.replace(/[\\%_]/g, c => '\\' + c)
const first = entry => {
  const m = entry?.meanings?.[0]
  return { pos: m?.pos || '', def: m?.defs?.[0]?.d || '', ph: entry?.phonetic || '' }
}
// "noun · /ˈswɒləʊ/": part of speech and pronunciation, whichever the dictionary has.
const meta = x => (x ? [x.pos, x.ph].filter(Boolean).join(' · ') : '')
const metaLine = { display: 'block', color: 'var(--text-secondary)' }
const NO_DEF = 'No definition found. You can still add it.'
const offlineMsg = () => (navigator.onLine ? 'Could not reach the dictionary. Try again.' : 'You are offline. Only words looked up before are available.')

/* Datamuse (https://www.datamuse.com/api/) lists words by prefix, most common first, with definitions,
   parts of speech and IPA. Entries it returns are kept for this visit, so a word added from a suggestion
   still has a definition when dictionaryapi.dev does not know it. */
const DM_POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' }
const dmEntries = new Map()
async function datamuse(w, signal) {
  const r = await fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(w.replace(/[*?#@,]/g, '')) + '*&md=dpr&ipa=1&max=20', { signal })
  if (!r.ok) throw new Error('datamuse failed')
  return (await r.json())
    .filter(x => /^[a-z][a-z'-]*$/.test(x.word) && x.defs?.length)
    .map(x => {
      const ipa = (x.tags || []).find(t => t.startsWith('ipa_pron:'))
      const meanings = x.defs.slice(0, 4).map(s => { const [p, d] = s.split('\t'); return { pos: DM_POS[p] || '', defs: [{ d: (d || p).trim(), e: '' }] } })
      const entry = { word: x.word, phonetic: ipa ? '/' + ipa.slice(9) + '/' : '', meanings }
      dmEntries.set(x.word, entry)
      return entry
    })
}

// A saved word's entry: the cache or dictionaryapi.dev, else what Datamuse gave for it (cached for next time).
async function define(w) {
  const e = await lookup(w)
  if (e) return e
  const dm = dmEntries.get(w)
  if (dm) supabase.rpc('cache_definition', { p_word: w, p_entry: dm }).then(() => {}, () => {})
  return dm || null
}

// Suggestions for what is typed: Datamuse's prefix matches merged with the shared cache, exact match first.
function useSuggestions(q, limit) {
  const [s, setS] = useState({ items: [], busy: false, err: '' })
  useEffect(() => {
    const w = norm(q)
    if (!w) { setS({ items: [], busy: false, err: '' }); return }
    let live = true
    const ctl = new AbortController()
    setS(x => ({ ...x, busy: true, err: '' }))
    const t = setTimeout(async () => {
      const [cachedRes, dmRes] = await Promise.allSettled([
        supabase.from('dictionary').select('word, entry').like('word', escapeLike(w) + '%').order('word').limit(limit),
        w.length >= 2 ? datamuse(w, ctl.signal) : Promise.resolve([]),
      ])
      if (!live) return
      const cached = new Map((cachedRes.status === 'fulfilled' ? cachedRes.value.data || [] : []).map(c => [c.word, c.entry]))
      const dm = dmRes.status === 'fulfilled' ? dmRes.value : null
      // Datamuse decides the order; a word already in the cache keeps the cache's definition.
      const toItem = (word, e, extra) => { const f = first(e); return { word, ...f, ph: f.ph || extra?.phonetic || '' } }
      let items = (dm || []).map(e => (cached.has(e.word) ? toItem(e.word, cached.get(e.word), e) : toItem(e.word, e)))
      for (const [word, e] of cached) if (!items.some(i => i.word === word)) items.push(toItem(word, e))
      const ex = items.findIndex(i => i.word === w)
      if (ex > 0) items = [items[ex], ...items.slice(0, ex), ...items.slice(ex + 1)]
      if (ex >= 0 || (dm && items.length)) { setS({ items: items.slice(0, limit), busy: false, err: '' }); return }
      // Datamuse unreachable or nothing found: try the exact word, as before.
      setS({ items: items.slice(0, limit), busy: true, err: '' })
      try {
        const entry = await lookup(w)
        if (!live) return
        items = entry ? [toItem(w, entry), ...items] : [...items, { word: w, pos: '', def: NO_DEF }]
        setS({ items: items.slice(0, limit), busy: false, err: '' })
      } catch {
        if (live) setS({ items: [...items, { word: w, pos: '', def: NO_DEF }].slice(0, limit), busy: false, err: offlineMsg() })
      }
    }, 250)
    return () => { live = false; clearTimeout(t); ctl.abort() }
  }, [q, limit])
  return s
}

// Definitions for the saved words: one query to the cache, then a lookup for any it does not have.
function useDefinitions(words) {
  const [defs, setDefs] = useState({})
  const key = words.map(w => w.word.toLowerCase()).sort().join('|')
  useEffect(() => {
    let live = true
    const list = key ? key.split('|') : []
    const missing = list.filter(w => !(w in defs))
    if (!missing.length) return
    ;(async () => {
      let rows = []
      try { const { data } = await supabase.from('dictionary').select('word, entry').in('word', missing); rows = data || [] } catch { /* offline */ }
      if (!live) return
      const got = Object.fromEntries(rows.map(r => [r.word, first(r.entry)]))
      setDefs(x => ({ ...x, ...got }))
      for (const w of missing.filter(w => !got[w]).slice(0, 12)) {
        try { const e = await define(w); if (!live) return; setDefs(x => ({ ...x, [w]: e ? first(e) : { pos: '', def: '', ph: '' } })) }
        catch { if (!live) return }
      }
    })()
    return () => { live = false }
  }, [key])  // eslint-disable-line
  return w => defs[w.word.toLowerCase()]
}

export default function Lexicon({ d, platform, header }) {
  const m = platform === 'mobile'
  const [adding, setAdding] = useState(false)
  const def = useDefinitions(d.words)
  const toast = useToast()
  const meaning = w => { const x = def(w); return x ? x.def || 'No definition saved.' : 'Looking up…' }

  if (m) return (
    <div style={{ padding: '14px 12px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PhoneSearch d={d} toast={toast} />
      {d.words.length === 0 && <EmptyState style={{ margin: '8px 4px' }}>No words yet. Search above and add the ones you want to remember.</EmptyState>}
      {d.words.map(w => (
        <WordCard key={w.id} word={w.word} onRemove={() => d.removeWord(w)}
          definition={<>{meta(def(w)) && <span style={metaLine}>{meta(def(w))}</span>}{meaning(w)}</>} />
      ))}
    </div>
  )
  return (
    <>
      {header(<Button icon="plus" onClick={() => setAdding(true)}>Add word</Button>)}
      {d.words.length === 0 && <EmptyState style={{ margin: '36px 0' }}>No words yet. Choose Add word to search the dictionary.</EmptyState>}
      {d.words.map(w => <WordEntry key={w.id} word={w.word} pos={meta(def(w))} definition={meaning(w)} onRemove={() => d.removeWord(w)} />)}
      {adding && <AddWordDrawer d={d} onClose={() => setAdding(false)} />}
    </>
  )
}

function AddWordDrawer({ d, onClose }) {
  const [q, setQ] = useState(''), [hot, setHot] = useState(0), [msg, setMsg] = useState('')
  const s = useSuggestions(q, 6)
  const dict = useDictation(t => { setQ(spoken(t)); setHot(0); setMsg('') }, setMsg)
  const have = new Set(d.words.map(w => w.word.toLowerCase()))
  useEffect(() => setHot(0), [s.items.length])
  async function add(word) {
    if (have.has(word)) return
    const e = await d.addWord(word)
    e ? setMsg(e) : (setQ(''), setMsg(''))
  }
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHot(i => Math.min(i + 1, Math.max(s.items.length - 1, 0))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHot(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = s.items[hot]; if (r) add(r.word) }
    else if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') }
  }
  const err = msg || s.err
  return (
    <FormOverlay title={'Add to ' + d.book.title} onClose={onClose}>
      <div style={{ margin: '-8px -24px -28px', display: 'flex', flexDirection: 'column' }}>
        <div className="de-search de-search--lg" style={{ margin: '0 24px 8px', borderColor: dict.listening ? 'var(--accent)' : undefined }}>
          <Icon name="search" size={18} />
          <input aria-label="Search for a word" placeholder={dict.listening ? 'Listening… say one word' : 'Search for a word'} value={q} autoFocus autoCapitalize="none"
            onChange={e => { setQ(e.target.value); setMsg('') }} onKeyDown={onKey} className="de-search__input" />
          <MicButton on={dict.listening} label={dict.listening ? 'Stop dictation' : 'Say a word to look up'} onClick={dict.toggle} style={{ flex: 'none', marginRight: -10 }} />
        </div>
        {err && <ErrorText style={{ margin: '0 24px 8px' }}>{err}</ErrorText>}
        <div style={{ flex: 1, padding: '4px 0 16px' }} role="listbox" aria-label="Suggestions">
          {s.items.map((r, i) => (
            <Suggestion key={r.word} word={r.word} pos={meta(r)} definition={r.def} badge={have.has(r.word) ? 'Saved' : ''} hot={i === hot}
              role="option" aria-selected={i === hot} onClick={() => add(r.word)} onMouseEnter={() => setHot(i)} />
          ))}
          {!q.trim() && <Note>Start typing to see words and their meanings.</Note>}
          {q.trim() && s.busy && s.items.length === 0 && <Note>Looking up{'…'}</Note>}
          {q.trim() && !s.busy && s.items.length === 0 && <Note>No matching words. Try a different spelling.</Note>}
        </div>
      </div>
    </FormOverlay>
  )
}

function PhoneSearch({ d, toast }) {
  const [q, setQ] = useState(''), [msg, setMsg] = useState('')
  const s = useSuggestions(q, 3)
  const dict = useDictation(t => { setQ(spoken(t)); setMsg('') }, setMsg)
  const have = new Set(d.words.map(w => w.word.toLowerCase()))
  async function add(word) {
    if (have.has(word)) return
    const e = await d.addWord(word)
    if (e) return setMsg(e)
    setQ(''); setMsg(''); toast('“' + word + '” added')
  }
  const err = msg || s.err
  return (
    <Panel platform="mobile" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Eyebrow style={{ color: dict.listening ? 'var(--accent)' : undefined }}>{dict.listening ? 'Listening… say one word' : 'Look up or add a word'}</Eyebrow>
      <SearchField size="touch" placeholder="Search the dictionary" value={q} onChange={e => { setQ(e.target.value); setMsg('') }}
        inputProps={{ autoCapitalize: 'none', enterKeyHint: 'search' }} style={{ borderColor: dict.listening ? 'var(--accent)' : undefined }}
        trailing={<MicButton on={dict.listening} label={dict.listening ? 'Stop dictation' : 'Say a word to look up'} onClick={dict.toggle} style={{ flex: 'none', width: 40, height: 40 }} />} />
      {err && <ErrorText>{err}</ErrorText>}
      {q.trim() && s.busy && s.items.length === 0 && <div className="app-meta">Looking up{'…'}</div>}
      {q.trim() && !s.busy && s.items.length === 0 && <div className="app-meta">No matching words. Try a different spelling.</div>}
      {s.items.map(r => {
        const added = have.has(r.word)
        return (
          <div key={r.word} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid var(--divider)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.word}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>{meta(r) && <span style={metaLine}>{meta(r)}</span>}{r.def}</div>
            </div>
            <Button style={{ minHeight: 44, padding: '0 14px' }} disabled={added} onClick={() => add(r.word)}>{added ? 'Added' : 'Add'}</Button>
          </div>
        )
      })}
    </Panel>
  )
}
