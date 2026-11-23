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
  return { pos: m?.pos || '', def: m?.defs?.[0]?.d || '' }
}
const NO_DEF = 'No definition found. You can still add it.'
const offlineMsg = () => (navigator.onLine ? 'Could not reach the dictionary. Try again.' : 'You are offline. Only words looked up before are available.')

// Suggestions for what is typed: prefix matches from the shared cache, plus an exact dictionary lookup.
function useSuggestions(q, limit) {
  const [s, setS] = useState({ items: [], busy: false, err: '' })
  useEffect(() => {
    const w = norm(q)
    if (!w) { setS({ items: [], busy: false, err: '' }); return }
    let live = true
    setS(x => ({ ...x, busy: true, err: '' }))
    const t = setTimeout(async () => {
      let cached = []
      try {
        const { data } = await supabase.from('dictionary').select('word, entry').like('word', escapeLike(w) + '%').order('word').limit(limit)
        cached = data || []
      } catch { /* offline: fall through to the exact lookup, which reports it */ }
      if (!live) return
      const toItem = c => ({ word: c.word, ...first(c.entry) })
      const exact = cached.find(c => c.word === w)
      let items = (exact ? [exact, ...cached.filter(c => c !== exact)] : cached).map(toItem)
      if (exact) { setS({ items, busy: false, err: '' }); return }
      setS({ items, busy: true, err: '' })
      try {
        const entry = await lookup(w)
        if (!live) return
        items = entry ? [toItem({ word: w, entry }), ...items] : [...items, { word: w, pos: '', def: NO_DEF }]
        setS({ items: items.slice(0, limit), busy: false, err: '' })
      } catch {
        if (live) setS({ items: [...items, { word: w, pos: '', def: NO_DEF }].slice(0, limit), busy: false, err: offlineMsg() })
      }
    }, 250)
    return () => { live = false; clearTimeout(t) }
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
        try { const e = await lookup(w); if (!live) return; setDefs(x => ({ ...x, [w]: e ? first(e) : { pos: '', def: '' } })) }
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
      {d.words.map(w => <WordCard key={w.id} word={w.word} definition={meaning(w)} onRemove={() => d.removeWord(w)} />)}
    </div>
  )
  return (
    <>
      {header(<Button icon="plus" onClick={() => setAdding(true)}>Add word</Button>)}
      {d.words.length === 0 && <EmptyState style={{ margin: '36px 0' }}>No words yet. Choose Add word to search the dictionary.</EmptyState>}
      {d.words.map(w => <WordEntry key={w.id} word={w.word} pos={def(w)?.pos || ''} definition={meaning(w)} onRemove={() => d.removeWord(w)} />)}
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
            <Suggestion key={r.word} word={r.word} pos={r.pos} definition={r.def} badge={have.has(r.word) ? 'Saved' : ''} hot={i === hot}
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
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>{r.def}</div>
            </div>
            <Button style={{ minHeight: 44, padding: '0 14px' }} disabled={added} onClick={() => add(r.word)}>{added ? 'Added' : 'Add'}</Button>
          </div>
        )
      })}
    </Panel>
  )
}
