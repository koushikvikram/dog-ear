import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Err, Mic } from '../util.jsx'

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
  supabase.rpc('cache_definition', { p_word: w, p_entry: entry }).then(() => {}) // fire and forget
  return entry
}

const Entry = ({ e }) => (
  <div>
    {e.phonetic && <span className="mute">{e.phonetic}</span>}
    {e.meanings.map((m, i) => (
      <div key={i}><p className="def"><i>{m.pos}</i></p>
        {m.defs.map((x, j) => <p className="def" key={j}>{x.d}{x.e && <><br /><i>“{x.e}”</i></>}</p>)}</div>
    ))}
  </div>
)

export default function Lexicon({ d }) {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [open, setOpen] = useState({}), [loadErr, setLoadErr] = useState('')
  useEffect(() => { d.loadWords().then(e => e && setLoadErr(e)) }, [])  // eslint-disable-line

  async function search(e) {
    e && e.preventDefault()
    const w = q.trim()
    if (!w) return setMsg('Type a word to look up.')
    setMsg(''); setRes(null); setBusy(true)
    try {
      const entry = await lookup(w)
      entry ? setRes({ word: w, entry }) : setMsg('No definition found for “' + w + '”. You can still add it to your list.')
      if (!entry) setRes({ word: w, entry: null })
    } catch { setMsg(navigator.onLine ? 'Could not reach the dictionary. Try again.' : 'You are offline. Only words you have looked up before are available.'); setRes({ word: w, entry: null }) }
    setBusy(false)
  }
  async function add(word) {
    const e = await d.addWord(word)
    e ? setMsg(e) : (setQ(''), setRes(null), setMsg(''))
  }
  async function toggle(w) {
    if (open[w.id]) return setOpen(o => ({ ...o, [w.id]: null }))
    setOpen(o => ({ ...o, [w.id]: 'loading' }))
    try { const e = await lookup(w.word); setOpen(o => ({ ...o, [w.id]: e || 'none' })) } catch { setOpen(o => ({ ...o, [w.id]: 'error' })) }
  }

  return (
    <>
      <form onSubmit={search} role="search" aria-label="Look up a word" style={{ marginBottom: 14 }}>
        <div className="boxed">
          <input className="inp" style={{ paddingLeft: 40 }} value={q} onChange={e => { setQ(e.target.value); setMsg('') }} placeholder="Search the dictionary" aria-label="Search the dictionary" autoCapitalize="none" />
          <svg style={{ position: 'absolute', left: 13, top: 13, color: 'var(--mute)' }} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          <Mic label="Dictate a word" onText={t => { const w = t.replace(/[.,!?]/g, '').trim().toLowerCase(); setQ(w); setMsg('') }} onError={setMsg} />
        </div>
        <Err>{msg}</Err>
      </form>
      {busy && <p className="mute">Looking up…</p>}
      {res && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row"><h3 className="serif grow" style={{ fontSize: 22 }}>{res.word}</h3>
            <button className="btn sm primary" onClick={() => add(res.word)}>Add to my words</button></div>
          {res.entry && <Entry e={res.entry} />}
        </div>
      )}
      <h2 style={{ fontSize: 18, marginBottom: 10 }}>My words{d.words ? ` (${d.words.length})` : ''}</h2>
      <Err>{loadErr}</Err>
      {d.words && d.words.length === 0 && <p className="mute">Words you add will collect here.</p>}
      {(d.words || []).map(w => (
        <div className="list-item" key={w.id} style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <button className="btn ghost" style={{ minHeight: 0, padding: 0, border: 0, fontFamily: 'var(--serif)', fontSize: 18 }} onClick={() => toggle(w)} aria-expanded={Boolean(open[w.id])}>{w.word}</button>
            {open[w.id] === 'loading' && <p className="def">Looking up…</p>}
            {open[w.id] === 'none' && <p className="def">No definition found.</p>}
            {open[w.id] === 'error' && <p className="err">Could not load the definition right now.</p>}
            {open[w.id] && typeof open[w.id] === 'object' && <Entry e={open[w.id]} />}
          </div>
          <button className="icon" aria-label={'Remove ' + w.word} onClick={() => d.removeWord(w)}>🗑</button>
        </div>
      ))}
    </>
  )
}
