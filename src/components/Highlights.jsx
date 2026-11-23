import React, { useEffect, useRef, useState } from 'react'
import {
  Badge, Button, Chip, EmptyState, ErrorText, Eyebrow, Field, HighlightCard, HighlightRow, MicButton, MicPill, Panel,
  SwatchRow, TextArea, TextButton, TextInput,
} from '../design-system/index.js'
import { firstName, joinText, useDictation, useToast } from '../util.jsx'
import { FormOverlay } from '../ui/overlays.jsx'
import { LABEL_COLORS, UNLABELLED, labelColor } from '../ui/palette.js'

const digits = v => v.replace(/\D/g, '')
const chipRow = { display: 'flex', flexWrap: 'wrap', gap: 6 }
const cap = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }
const toggle = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

export default function Highlights({ d, platform, header, onQueued }) {
  const m = platform === 'mobile'
  const toast = useToast()
  const [page, setPage] = useState(''), [note, setNote] = useState(''), [quote, setQuote] = useState('')
  const [showQ, setShowQ] = useState(false), [showM, setShowM] = useState(false)
  const [labelId, setLabelId] = useState(d.labels[0]?.id || ''), [mentions, setMentions] = useState([])
  const [msg, setMsg] = useState(''), [filter, setFilter] = useState('all')
  const [form, setForm] = useState(null)       // { h } edit | { draft } new (desktop drawer)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const dict = useDictation(t => { setNote(n => joinText(n, t)); setMsg('') }, setMsg)

  useEffect(() => { if (labelId && !d.labels.some(l => l.id === labelId)) setLabelId('') }, [d.labels, labelId])
  useEffect(() => { if (filter !== 'all' && filter !== 'none' && !d.labels.some(l => l.id === filter)) setFilter('all') }, [d.labels, filter])

  async function save() {
    const p = page.trim()
    if (!p || Number(p) < 1) return setMsg('Add the page number first.')
    if (!note.trim() && !quote.trim()) return setMsg('Add a thought or a quote.')
    setMsg('')
    const r = await d.addHighlight({ page: p, note: note.trim(), quote: quote.trim(), labelId, mentions })
    if (!r.ok) return setMsg(r.message)
    onQueued && onQueued()
    if (m || r.queued) toast(r.queued ? 'Saved on this device. Will sync when online.' : 'Highlight saved')
    // keep the page: the next thought is usually on the same or the next page
    setNote(''); setQuote(''); setMentions([]); setShowQ(false); setShowM(false)
  }
  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }

  const label = id => d.labels.find(l => l.id === id)
  const labelOf = h => { const l = label(h.label_id); return l ? { name: l.name, color: labelColor(l.color_index) } : { name: 'Unlabelled', color: UNLABELLED } }
  const names = h => (h.mentions || []).map(id => d.characters.find(c => c.id === id)).filter(Boolean).map(firstName).join(', ')
  const labelText = h => h.pending ? <>{labelOf(h).name} <Badge tone="pending" style={{ marginLeft: 6 }}>Waiting to sync</Badge></> : labelOf(h).name

  const thoughtLabel = <span style={{ color: dict.listening ? 'var(--accent)' : undefined }}>{dict.listening ? 'Listening…' : 'Your thought'}</span>
  const mentionToggle = showM ? 'Hide characters' : mentions.length ? 'Characters (' + mentions.length + ')' : '+ Who is in it?'
  const size = m ? 'touch' : 'md'

  const capture = (
    <Panel platform={platform} style={{ marginTop: m ? 0 : 24, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Quick capture">
      <Eyebrow>{m ? 'Quick capture' : 'Quick capture from your book'}</Eyebrow>
      <div style={{ display: 'flex', gap: m ? 10 : 12, alignItems: 'stretch' }}>
        <Field platform={platform} label="Page" style={{ flex: 'none', width: m ? 84 : 92 }}>
          <TextInput pageNumber ground={m ? 'page' : 'card'} size={m ? 'lg' : 'md'} inputMode="numeric" placeholder={m ? '42' : '142'} value={page}
            onChange={e => { setPage(digits(e.target.value)); setMsg('') }}
            style={{ flex: 1, width: '100%', fontSize: m ? 22 : 24, fontWeight: 700, padding: '0 8px' }} />
        </Field>
        <Field platform={platform} label={thoughtLabel} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ position: 'relative', display: 'flex', flex: 1 }}>
            <TextArea size={m ? 'lg' : 'md'} placeholder="What stuck with you?" value={note} onKeyDown={onKey}
              onChange={e => { setNote(e.target.value); setMsg('') }}
              style={{ minHeight: 96, flex: 1, paddingRight: 58, resize: 'none', borderColor: dict.listening ? 'var(--accent)' : undefined }} />
            <MicButton on={dict.listening} label={dict.listening ? 'Stop dictation' : 'Dictate'} onClick={dict.toggle}
              style={{ position: 'absolute', right: 6, bottom: 6 }} />
          </span>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: m ? 18 : 20, flexWrap: 'wrap', marginTop: -4 }}>
        <TextButton onClick={() => { setShowQ(!showQ); if (showQ) setQuote('') }} aria-expanded={showQ}>{showQ ? 'Remove quote' : '+ Add quote'}</TextButton>
        {d.characters.length > 0 && <TextButton onClick={() => setShowM(!showM)} aria-expanded={showM}>{mentionToggle}</TextButton>}
      </div>
      {showQ && (
        <Field platform={platform} label="Quote from the page">
          <TextArea size={m ? 'lg' : 'md'} className="app-quote" placeholder="The exact words, if you want them" value={quote}
            onChange={e => { setQuote(e.target.value); setMsg('') }} style={{ minHeight: m ? 72 : 76, resize: 'none', fontSize: 16 }} />
        </Field>
      )}
      {showM && (
        <div>
          {m ? <div style={cap}>Who is in it?</div> : <Eyebrow style={{ marginBottom: 8 }}>Who is in it?</Eyebrow>}
          <div role="group" aria-label="Characters in this highlight" style={chipRow}>
            {d.characters.map(c => <Chip key={c.id} size={size} selected={mentions.includes(c.id)} onClick={() => setMentions(x => toggle(x, c.id))}>{firstName(c)}</Chip>)}
          </div>
        </div>
      )}
      <div style={m ? null : { ...chipRow, gap: 8, alignItems: 'center' }}>
        {m ? <div style={cap}>Label</div> : <Eyebrow as="span" style={{ marginRight: 4 }}>Label</Eyebrow>}
        <div role="group" aria-label="Label" style={m ? chipRow : { display: 'contents' }}>
          {d.labels.map(l => <Chip key={l.id} size={size} selected={labelId === l.id} dot={labelColor(l.color_index)} onClick={() => setLabelId(labelId === l.id ? '' : l.id)}>{l.name}</Chip>)}
          {m && <Chip size="touch" add onClick={() => setLabelsOpen(true)} aria-label="Add or manage labels">+ Add</Chip>}
        </div>
      </div>
      {msg && <ErrorText>{msg}</ErrorText>}
      <Button block onClick={save}>Save highlight</Button>
      {!m && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page numbers are kept as you go. Press Enter to save, or Shift+Enter for a new line.</div>}
    </Panel>
  )

  const overlays = (
    <>
      {form && <HighlightForm d={d} platform={platform} h={form.h} draft={form.draft} onClose={() => setForm(null)}
        onSaved={msgText => { msgText && toast(msgText); onQueued && onQueued() }} />}
      {labelsOpen && <LabelsOverlay d={d} platform={platform} onClose={() => setLabelsOpen(false)} />}
    </>
  )

  if (m) return (
    <div style={{ padding: '14px 12px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {capture}
      {d.highlights.length === 0 && <EmptyState style={{ margin: '8px 4px' }}>No highlights yet. Note the page number, add a few words, and save. You can dictate it too.</EmptyState>}
      {d.highlights.map(h => (
        <HighlightCard key={h.id} page={h.page} label={labelText(h)} labelColor={labelOf(h).color} quote={h.quote || null} note={h.note || null}
          names={names(h) || null} onOpen={() => setForm({ h })} onRemove={() => d.removeHighlight(h)} />
      ))}
      {overlays}
    </div>
  )

  // Desktop: sorted by page, filtered by label.
  const count = id => d.highlights.filter(h => (id === 'none' ? !label(h.label_id) : h.label_id === id)).length
  const filters = [{ id: 'all', name: 'All ' + d.highlights.length }]
    .concat(d.labels.map(l => ({ id: l.id, name: l.name + ' ' + count(l.id) })))
    .concat(count('none') ? [{ id: 'none', name: 'Unlabelled ' + count('none') }] : [])
  const shown = d.highlights
    .filter(h => filter === 'all' || (filter === 'none' ? !label(h.label_id) : h.label_id === filter))
    .slice().sort((a, b) => a.page - b.page || (a.created_at > b.created_at ? 1 : -1))
  return (
    <>
      {header(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => setLabelsOpen(true)}>Manage labels</Button>
          <Button icon="plus" onClick={() => setForm({ draft: { page, note, quote, labelId, mentions } })}>Capture with details</Button>
        </div>
      )}
      {capture}
      <div style={{ ...chipRow, gap: 8, alignItems: 'center', margin: '24px 0 4px' }} role="group" aria-label="Filter by label">
        <Eyebrow as="span" style={{ marginRight: 4 }}>Your highlights</Eyebrow>
        {filters.map(f => <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</Chip>)}
      </div>
      {shown.length === 0 && <EmptyState style={{ margin: '24px 0' }}>{d.highlights.length ? 'No highlights with that label yet.' : 'Nothing here yet. Use quick capture above while you read.'}</EmptyState>}
      {shown.map(h => (
        <HighlightRow key={h.id} page={h.page} label={labelText(h)} labelColor={labelOf(h).color} quote={h.quote || null}
          note={h.note || null} mentions={names(h) || null} onOpen={() => setForm({ h })} />
      ))}
      {overlays}
    </>
  )
}

/* New (desktop "Capture with details") or edit highlight. Desktop: right drawer; phone: tall sheet. */
function HighlightForm({ d, platform, h, draft, onClose, onSaved }) {
  const m = platform === 'mobile'
  const blank = { page: '', note: '', quote: '', labelId: d.labels[0]?.id || '', mentions: [] }
  const init = h ? { page: String(h.page), note: h.note || '', quote: h.quote || '', labelId: h.label_id || '', mentions: h.mentions || [] } : { ...blank, ...draft }
  const [f, setF] = useState(init), [err, setErr] = useState('')
  const put = p => { setF(x => ({ ...x, ...p })); setErr('') }
  const qDict = useDictation(t => setF(x => ({ ...x, quote: joinText(x.quote, t) })), setErr)
  const nDict = useDictation(t => setF(x => ({ ...x, note: joinText(x.note, t) })), setErr)

  async function save(another) {
    if (!f.page || Number(f.page) < 1) return setErr('Add the page number first.')
    if (!f.note.trim() && !f.quote.trim()) return setErr('Add a thought or a quote.')
    if (h) {
      const e = await d.updateHighlight(h.id, { page: Number(f.page), note: f.note.trim() || null, quote: f.quote.trim() || null, label_id: f.labelId || null }, f.mentions)
      if (e) return setErr(e)
      onSaved('Highlight updated'); onClose()
    } else {
      const r = await d.addHighlight({ page: f.page, note: f.note.trim(), quote: f.quote.trim(), labelId: f.labelId, mentions: f.mentions })
      if (!r.ok) return setErr(r.message)
      onSaved(r.queued ? 'Saved on this device. Will sync when online.' : 'Highlight saved')
      if (another) setF({ ...blank, page: f.page, labelId: f.labelId }); else onClose()
    }
  }
  const remove = () => { d.removeHighlight(h); onClose() }
  const labels = d.labels.map(l => <Chip key={l.id} size={m ? 'touch' : 'md'} selected={f.labelId === l.id} dot={labelColor(l.color_index)} onClick={() => put({ labelId: f.labelId === l.id ? '' : l.id })}>{l.name}</Chip>)
  const people = d.characters.map(c => <Chip key={c.id} size={m ? 'touch' : 'md'} selected={f.mentions.includes(c.id)} onClick={() => put({ mentions: toggle(f.mentions, c.id) })}>{firstName(c)}</Chip>)

  if (m) return (
    <FormOverlay kind="sheet" tall title="Edit highlight" onClose={onClose} focus={false}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field platform="mobile" label="Page" style={{ width: 92, flex: 'none' }}>
          <TextInput ground="page" size="lg" inputMode="numeric" value={f.page} onChange={e => put({ page: digits(e.target.value) })} />
        </Field>
        <div style={{ flex: 1, minWidth: 0 }}><div style={cap}>Label</div><div style={chipRow}>{labels}</div></div>
      </div>
      <Field platform="mobile" label="Your thought"><TextArea size="lg" style={{ minHeight: 72 }} value={f.note} onChange={e => put({ note: e.target.value })} /></Field>
      <Field platform="mobile" label="Quote from the page"><TextArea size="lg" className="app-quote" style={{ minHeight: 72 }} value={f.quote} onChange={e => put({ quote: e.target.value })} /></Field>
      {d.characters.length > 0 && <div><div style={cap}>Who is in it?</div><div style={chipRow}>{people}</div></div>}
      {err && <ErrorText>{err}</ErrorText>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button style={{ flex: 1 }} onClick={() => save(false)}>Save</Button>
        <Button variant="subtle" platform="mobile" onClick={onClose}>Cancel</Button>
        <Button variant="subtle" platform="mobile" tone="danger" onClick={remove}>Remove</Button>
      </div>
    </FormOverlay>
  )
  const micRow = (text, dict) => (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {text}<MicPill recording={dict.listening} onClick={dict.toggle} style={{ minHeight: 40 }}>{dict.listening ? 'Listening. Tap to stop' : 'Dictate'}</MicPill>
    </span>
  )
  return (
    <FormOverlay title={h ? 'Edit highlight' : 'New highlight'} onClose={onClose}>
      <Field label="Page">
        <TextInput pageNumber style={{ width: 110 }} inputMode="numeric" placeholder="142" value={f.page} onChange={e => put({ page: digits(e.target.value) })} />
      </Field>
      <div className="de-field">
        {micRow('Quote from the book (optional)', qDict)}
        <TextInput as="textarea" rows={3} aria-label="Quote from the book" value={f.quote} placeholder="Type it or dictate it" onChange={e => put({ quote: e.target.value })}
          className="app-quote" style={{ padding: '10px 14px', lineHeight: 1.5, resize: 'vertical', fontSize: 16 }} />
      </div>
      <div className="de-field">
        {micRow('Your thought (optional)', nDict)}
        <TextInput as="textarea" rows={3} aria-label="Your thought" value={f.note} placeholder="Why does this matter?" onChange={e => put({ note: e.target.value })}
          style={{ padding: '10px 14px', lineHeight: 1.5, resize: 'vertical' }} />
      </div>
      {err && <ErrorText>{err}</ErrorText>}
      <div><Eyebrow style={{ marginBottom: 8 }}>Label</Eyebrow><div role="group" aria-label="Label" style={{ ...chipRow, gap: 8 }}>{labels}</div></div>
      {d.characters.length > 0 && <div><Eyebrow style={{ marginBottom: 8 }}>Who is in it? (optional)</Eyebrow><div role="group" aria-label="Characters mentioned" style={{ ...chipRow, gap: 8 }}>{people}</div></div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={() => save(false)}>Save</Button>
        {!h && <Button variant="subtle" onClick={() => save(true)}>Save and add another</Button>}
      </div>
      {h && <Button variant="subtle" tone="danger" onClick={remove}>Remove highlight</Button>}
    </FormOverlay>
  )
}

/* Rename-as-you-type with one write per pause; an empty or duplicate name is never saved. */
export function useDraftNames(items, save, dupMsg) {
  const [drafts, setDrafts] = useState({}), [err, setErr] = useState('')
  const timers = useRef({})
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])
  const rename = (item, name) => {
    setDrafts(x => ({ ...x, [item.id]: name })); setErr('')
    clearTimeout(timers.current[item.id])
    timers.current[item.id] = setTimeout(async () => {
      const v = name.trim()
      if (!v || v === item.name) return
      if (items.some(o => o.id !== item.id && o.name.toLowerCase() === v.toLowerCase())) return setErr(dupMsg)
      const e = await save(item.id, { name: v })
      if (e) setErr(e); else setDrafts(x => { const n = { ...x }; delete n[item.id]; return n })
    }, 600)
  }
  return { nameOf: item => drafts[item.id] ?? item.name, rename, err, setErr }
}

function LabelsOverlay({ d, platform, onClose }) {
  const m = platform === 'mobile'
  const [name, setName] = useState(''), [err, setErr] = useState('')
  const names = useDraftNames(d.labels, d.updateLabel, 'You already have a label with that name.')
  async function add(e) {
    e && e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Give the label a name.')
    if (d.labels.some(l => l.name.toLowerCase() === n.toLowerCase())) return setErr('You already have a label with that name.')
    const e2 = await d.addLabel(n); e2 ? setErr(e2) : (setName(''), setErr(''))
  }
  const count = l => d.highlights.filter(h => h.label_id === l.id).length
  const rows = d.labels.map(l => (
    <SwatchRow key={l.id} platform={platform} color={labelColor(l.color_index)} name={names.nameOf(l)} count={m ? undefined : count(l)}
      onCycle={() => d.updateLabel(l.id, { color_index: (l.color_index + 1) % LABEL_COLORS.length })}
      onRename={e => names.rename(l, e.target.value)} onRemove={() => d.removeLabel(l)}
      inputLabel="Label name" removeLabel={'Delete label ' + l.name} />
  ))
  const adder = (
    <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
      <TextInput ground={m ? 'page' : 'card'} size={m ? 'lg' : 'md'} style={{ flex: 1, minWidth: 0 }} placeholder={m ? 'New label' : 'New label, for example Foreshadowing'}
        aria-label="New label name" value={name} maxLength={40} onChange={e => { setName(e.target.value); setErr('') }} />
      <Button type="submit">Add</Button>
    </form>
  )
  const error = (err || names.err) && <ErrorText>{err || names.err}</ErrorText>
  if (m) return (
    <FormOverlay kind="sheet" title="Highlight labels" onClose={onClose} focus={false}>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>Rename the defaults or add your own. Removing a label keeps its highlights, marked Unlabelled.</div>
      {rows}{adder}{error}
    </FormOverlay>
  )
  return (
    <FormOverlay title={'Highlight labels in ' + d.book.title} onClose={onClose} focus={false}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)' }}>
        Labels group your highlights. Start with the four defaults, rename them, or add your own. Removing a label keeps its highlights, marked Unlabelled.
      </p>
      <div>{rows}</div>
      {adder}{error}
    </FormOverlay>
  )
}
