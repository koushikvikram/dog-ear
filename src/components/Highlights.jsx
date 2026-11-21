import React, { useState } from 'react'
import { Dialog, Err, Field, LABEL_COLORS, Mic, firstName, joinText, labelColor } from '../util.jsx'

export default function Highlights({ d, onQueued }) {
  const [page, setPage] = useState(''), [note, setNote] = useState(''), [quote, setQuote] = useState('')
  const [showQ, setShowQ] = useState(false), [showM, setShowM] = useState(false)
  const [labelId, setLabelId] = useState(d.labels[0]?.id || ''), [mentions, setMentions] = useState([])
  const [msg, setMsg] = useState(''), [filter, setFilter] = useState('all')
  const [edit, setEdit] = useState(null), [labelsOpen, setLabelsOpen] = useState(false)

  async function save() {
    const p = page.trim()
    if (!/^\d+$/.test(p) || Number(p) < 1) return setMsg('Add the page number first.')
    if (!note.trim() && !quote.trim()) return setMsg('Add a thought or a quote.')
    setMsg('')
    const r = await d.addHighlight({ page: p, note: note.trim(), quote: quote.trim(), labelId, mentions })
    if (!r.ok) return setMsg('Could not save. ' + r.message)
    onQueued && onQueued()
    setNote(''); setQuote(''); setMentions([]); setShowQ(false); setShowM(false)
    // keep the page: the next thought is usually on the same or the next page
  }
  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }
  const label = id => d.labels.find(l => l.id === id)
  const shown = d.highlights.filter(h => filter === 'all' || (filter === 'none' ? !h.label_id : h.label_id === filter))
  const charName = id => { const c = d.characters.find(c => c.id === id); return c ? c.name : null }

  return (
    <>
      <section className="card qc" aria-label="Quick capture" style={{ marginBottom: 22 }}>
        <div className="row wrap" style={{ alignItems: 'flex-end', gap: 14 }}>
          <Field label="Page"><input className="inp pageno" inputMode="numeric" value={page} onChange={e => { setPage(e.target.value.replace(/\D/g, '')); setMsg('') }} placeholder="42" /></Field>
          <div className="grow fld" style={{ minWidth: 220 }}>
            <label htmlFor="thought">Your thought</label>
            <div className="boxed">
              <textarea id="thought" className="inp" rows={2} value={note} onKeyDown={onKey} onChange={e => { setNote(e.target.value); setMsg('') }} placeholder="What stopped you here?" />
              <Mic onText={t => setNote(n => joinText(n, t))} onError={setMsg} />
            </div>
          </div>
        </div>
        {showQ && (
          <div className="fld" style={{ marginTop: 10 }}>
            <label htmlFor="quote">Quote from the page</label>
            <div className="boxed">
              <textarea id="quote" className="inp serif" style={{ fontStyle: 'italic' }} rows={2} value={quote} onChange={e => { setQuote(e.target.value); setMsg('') }} />
              <Mic label="Dictate the quote" onText={t => setQuote(n => joinText(n, t))} onError={setMsg} />
            </div>
          </div>
        )}
        <div className="row wrap" style={{ marginTop: 10 }}>
          <button type="button" className="chip dash" onClick={() => { setShowQ(!showQ); showQ && setQuote('') }}>{showQ ? 'Remove quote' : '+ Add quote'}</button>
          {d.characters.length > 0 && <button type="button" className="chip dash" onClick={() => setShowM(!showM)}>{showM ? 'Hide characters' : mentions.length ? `Characters (${mentions.length})` : '+ Who is in it?'}</button>}
        </div>
        {showM && <div className="row wrap" style={{ marginTop: 10 }}>{d.characters.map(c => {
          const on = mentions.includes(c.id)
          return <button type="button" key={c.id} className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setMentions(m => on ? m.filter(x => x !== c.id) : [...m, c.id])}>{firstName(c)}</button>
        })}</div>}
        <div className="row wrap" style={{ marginTop: 12 }} role="group" aria-label="Label">
          {d.labels.map(l => <button type="button" key={l.id} className={'chip' + (labelId === l.id ? ' on' : '')} aria-pressed={labelId === l.id} onClick={() => setLabelId(labelId === l.id ? '' : l.id)}>
            <span className="dot" style={{ background: labelColor(l.color_index) }} />{l.name}</button>)}
          <button type="button" className="chip dash" onClick={() => setLabelsOpen(true)}>+ Add</button>
        </div>
        <Err>{msg}</Err>
        <button className="btn primary wide" style={{ marginTop: 14 }} onClick={save}>Save highlight</button>
      </section>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <h2 className="grow" style={{ fontSize: 18 }}>{d.highlights.length} highlight{d.highlights.length === 1 ? '' : 's'}</h2>
        <button className="btn sm" onClick={() => setLabelsOpen(true)}>Manage labels</button>
      </div>
      <div className="row wrap" style={{ marginBottom: 14 }} role="group" aria-label="Filter by label">
        <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>All</button>
        {d.labels.map(l => <button key={l.id} className={'chip' + (filter === l.id ? ' on' : '')} onClick={() => setFilter(l.id)}><span className="dot" style={{ background: labelColor(l.color_index) }} />{l.name}</button>)}
        <button className={'chip' + (filter === 'none' ? ' on' : '')} onClick={() => setFilter('none')}>Unlabelled</button>
      </div>
      {shown.length === 0 && <p className="mute">{d.highlights.length ? 'Nothing under that label.' : 'Your first highlight will show up here.'}</p>}
      {shown.map(h => {
        const l = label(h.label_id)
        return (
          <article key={h.id} className="hl" tabIndex={0} style={{ borderLeftColor: l ? labelColor(l.color_index) : 'var(--line2)' }}
            onClick={() => setEdit(h)} onKeyDown={e => e.key === 'Enter' && setEdit(h)}>
            <div className="meta"><b style={{ color: 'var(--text)' }}>p. {h.page}</b><span>{l ? l.name : 'Unlabelled'}</span>{h.pending && <span className="sync off">waiting to sync</span>}
              <span className="grow" />
              <button className="icon" aria-label="Remove highlight" onClick={e => { e.stopPropagation(); d.removeHighlight(h) }}>🗑</button></div>
            {h.quote && <q>“{h.quote}”</q>}
            {h.note && <div>{h.note}</div>}
            {h.mentions?.length > 0 && <div className="mute" style={{ fontSize: 13, marginTop: 4 }}>{h.mentions.map(charName).filter(Boolean).join(', ')}</div>}
          </article>
        )
      })}

      {edit && <EditHighlight d={d} h={edit} onClose={() => setEdit(null)} />}
      {labelsOpen && <LabelsDialog d={d} onClose={() => setLabelsOpen(false)} />}
    </>
  )
}

function EditHighlight({ d, h, onClose }) {
  const [page, setPage] = useState(String(h.page)), [note, setNote] = useState(h.note || ''), [quote, setQuote] = useState(h.quote || '')
  const [labelId, setLabelId] = useState(h.label_id || ''), [mentions, setMentions] = useState(h.mentions || []), [err, setErr] = useState('')
  async function save() {
    if (!/^\d+$/.test(page) || Number(page) < 1) return setErr('Add the page number.')
    if (!note.trim() && !quote.trim()) return setErr('Add a thought or a quote.')
    const e = await d.updateHighlight(h.id, { page: Number(page), note: note.trim() || null, quote: quote.trim() || null, label_id: labelId || null }, mentions)
    e ? setErr(e) : onClose()
  }
  return (
    <Dialog title="Edit highlight" onClose={onClose} wide footer={<>
      <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => { d.removeHighlight(h); onClose() }}>Remove</button>
      <button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="stack">
        <Field label="Page"><input className="inp" inputMode="numeric" value={page} onChange={e => setPage(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Label"><select className="inp" value={labelId} onChange={e => setLabelId(e.target.value)}><option value="">Unlabelled</option>{d.labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
        <div className="fld"><label htmlFor="en">Thought</label><div className="boxed"><textarea id="en" className="inp" rows={3} value={note} onChange={e => setNote(e.target.value)} /><Mic onText={t => setNote(n => joinText(n, t))} onError={setErr} /></div></div>
        <div className="fld"><label htmlFor="eq">Quote</label><div className="boxed"><textarea id="eq" className="inp serif" style={{ fontStyle: 'italic' }} rows={2} value={quote} onChange={e => setQuote(e.target.value)} /><Mic label="Dictate the quote" onText={t => setQuote(n => joinText(n, t))} onError={setErr} /></div></div>
        {d.characters.length > 0 && <div className="fld">Who is in it
          <div className="row wrap">{d.characters.map(c => { const on = mentions.includes(c.id); return <button type="button" key={c.id} className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setMentions(m => on ? m.filter(x => x !== c.id) : [...m, c.id])}>{firstName(c)}</button> })}</div></div>}
        <Err>{err}</Err>
      </div>
    </Dialog>
  )
}

function LabelsDialog({ d, onClose }) {
  const [name, setName] = useState(''), [err, setErr] = useState('')
  async function add(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Name the label.')
    if (d.labels.some(l => l.name.toLowerCase() === n.toLowerCase())) return setErr('You already have a label with that name.')
    const e2 = await d.addLabel(n); e2 ? setErr(e2) : (setName(''), setErr(''))
  }
  return (
    <Dialog title="Highlight labels" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      {d.labels.map(l => (
        <div className="list-item" key={l.id}>
          <button className="dot" style={{ background: labelColor(l.color_index), width: 22, height: 22, border: 0 }} aria-label={'Change colour of ' + l.name}
            onClick={() => d.updateLabel(l.id, { color_index: (l.color_index + 1) % LABEL_COLORS.length })} />
          <input className="inp grow" aria-label={'Rename ' + l.name} defaultValue={l.name} maxLength={40}
            onBlur={e => { const v = e.target.value.trim(); if (!v) e.target.value = l.name; else if (v !== l.name) d.updateLabel(l.id, { name: v }).then(x => x && (setErr(x), (e.target.value = l.name))) }} />
          <button className="icon" aria-label={'Delete ' + l.name} onClick={() => d.removeLabel(l)}>🗑</button>
        </div>
      ))}
      <form className="row" onSubmit={add} style={{ marginTop: 10 }}>
        <input className="inp grow" placeholder="New label" value={name} onChange={e => { setName(e.target.value); setErr('') }} maxLength={40} />
        <button className="btn">Add</button>
      </form>
      <Err>{err}</Err>
    </Dialog>
  )
}
