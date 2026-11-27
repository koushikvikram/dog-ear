import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  ActionBanner, Button, CanvasToolbar, CharacterNode, Chip, Dot, EmptyState, ErrorText, Eyebrow, Fab, Field, GraphCanvas,
  GraphControls, HighlightRow, HintBar, Icon, IconButton, NodePill, Panel, Popover, Select, SelectionBar, SwatchRow, Tab, TextArea,
  TextButton, TextInput, TieLabel,
} from '../design-system/index.js'
import { firstName as first, uid, useToast } from '../util.jsx'
import { FormOverlay } from '../ui/overlays.jsx'
import { TIE_COLORS, TIE_UNTYPED, UNLABELLED, avatarColor, labelColor, tieColor } from '../ui/palette.js'
import { useDraftNames } from './Highlights.jsx'
import { DESK, PHONE, arrow, autoArrange, clip, deskEdges, fitView, phoneEdge, typeStyle } from './graph.js'

const TIP = 'dogear.tipGraph'
const readTip = () => { try { return !localStorage.getItem(TIP) } catch { return true } }
const hideTip = () => { try { localStorage.setItem(TIP, '1') } catch { /* private mode */ } }
const digits = v => v.replace(/\D/g, '')
const chipRow = { display: 'flex', flexWrap: 'wrap', gap: 6 }

export default function Characters(props) {
  return props.platform === 'mobile' ? <PhoneGraph {...props} /> : <DeskGraph {...props} />
}

/* ---------------- shared: canvas view, gestures, other books ---------------- */

// Pan/zoom state plus pointer gestures on a canvas element. classify(target) says what was pressed:
// { type: 'node' | 'handle', id } | { type: 'ui' } (let the control handle it) | { type: 'bg' }.
function useCanvas({ min, max, initialK = 1, classify, onTap, onDrag, onDraw, onDrawEnd, fitPad }) {
  const ref = useRef()
  const [view, setView] = useState({ tx: 0, ty: 0, k: initialK })
  const [size, setSize] = useState({ W: 0, H: 0 })
  const vr = useRef(view); vr.current = view
  const g = useRef(null), ptrs = useRef(new Map())
  const cb = useRef({}); cb.current = { classify, onTap, onDrag, onDraw, onDrawEnd }
  const clampK = k => Math.min(max, Math.max(min, k))

  // ref is a wrapper around the GraphCanvas (which cannot take a ref); measure the canvas inside it.
  const canvas = () => ref.current.firstElementChild
  useEffect(() => {
    const el = ref.current
    const ro = new ResizeObserver(([e]) => setSize({ W: Math.round(e.contentRect.width), H: Math.round(e.contentRect.height) }))
    ro.observe(canvas())
    const wheel = ev => {
      if (ev.target.closest('.de-popover')) return
      ev.preventDefault()
      const { x: px, y: py } = local(ev), v = vr.current
      if (ev.ctrlKey || ev.metaKey) {
        const k2 = clampK(v.k * Math.exp(-ev.deltaY * 0.01)), wx = (px - v.tx) / v.k, wy = (py - v.ty) / v.k
        setView({ k: k2, tx: px - wx * k2, ty: py - wy * k2 })
      } else setView({ ...v, tx: v.tx - ev.deltaX, ty: v.ty - ev.deltaY })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', wheel) }
  }, [])  // eslint-disable-line

  function local(e) { const c = canvas(), r = c.getBoundingClientRect(); return { x: e.clientX - r.left - c.clientLeft, y: e.clientY - r.top - c.clientTop } }
  const world = e => { const p = local(e), v = vr.current; return { x: (p.x - v.tx) / v.k, y: (p.y - v.ty) / v.k } }
  const zoomAt = (f, px = size.W / 2, py = size.H / 2) => setView(v => { const k2 = clampK(v.k * f), wx = (px - v.tx) / v.k, wy = (py - v.ty) / v.k; return { k: k2, tx: px - wx * k2, ty: py - wy * k2 } })
  const fit = chars => setView(fitView(chars, size.W, size.H, { ...fitPad, min, max }))

  const handlers = {
    onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return
      const kind = cb.current.classify(e.target)
      if (kind.type === 'ui') return
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      e.currentTarget.setPointerCapture(e.pointerId)
      if (ptrs.current.size === 2) {
        const [a, b] = [...ptrs.current.values()]
        g.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: true }
        return
      }
      if (kind.type !== 'bg') e.preventDefault()
      g.current = { ...kind, sx: e.clientX, sy: e.clientY, moved: false, v0: vr.current, o: kind.pos }
    },
    onPointerMove(e) {
      if (!ptrs.current.has(e.pointerId)) return
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const s = g.current
      if (!s) return
      if (s.type === 'pinch') {
        if (ptrs.current.size < 2) return
        const [a, b] = [...ptrs.current.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const { x: px, y: py } = local({ clientX: mid.x, clientY: mid.y })
        setView(v => { const k2 = clampK(v.k * dist / s.dist), wx = (px - (mid.x - s.mid.x) - v.tx) / v.k, wy = (py - (mid.y - s.mid.y) - v.ty) / v.k; return { k: k2, tx: px - wx * k2, ty: py - wy * k2 } })
        s.dist = dist; s.mid = mid
        return
      }
      const dx = e.clientX - s.sx, dy = e.clientY - s.sy
      if (!s.moved && Math.abs(dx) + Math.abs(dy) < 4) return
      s.moved = true
      if (s.type === 'bg') setView({ ...s.v0, tx: s.v0.tx + dx, ty: s.v0.ty + dy })
      else if (s.type === 'node' && s.o) cb.current.onDrag(s.id, { x: s.o.x + dx / vr.current.k, y: s.o.y + dy / vr.current.k })
      else if (s.type === 'handle') cb.current.onDraw(s.id, world(e))
    },
    onPointerUp(e) {
      if (!ptrs.current.delete(e.pointerId)) return
      const s = g.current
      if (!s) return
      if (s.type === 'pinch') { if (ptrs.current.size === 0) g.current = null; return }
      g.current = null
      if (!s.moved) cb.current.onTap(s)
      else if (s.type === 'handle') cb.current.onDrawEnd(s.id, world(e))
    },
  }
  handlers.onPointerCancel = e => { ptrs.current.delete(e.pointerId); const s = g.current; g.current = null; if (s?.type === 'handle') cb.current.onDrawEnd(s.id, null) }
  return { ref, view, setView, size, zoomAt, fit, handlers }
}

// The reader's other books, for "Copy types from another book". Loaded when first needed.
function useOtherBooks(bookId, enabled) {
  const [books, setBooks] = useState(null)
  useEffect(() => {
    if (!enabled || books) return
    supabase.rpc('library_books').then(({ data }) => setBooks((data || []).filter(b => b.id !== bookId)), () => setBooks([]))
  }, [enabled])  // eslint-disable-line
  return books || []
}

// A text field that saves when it loses focus (or when the form closes), not on every keystroke.
function useSaved(value, save) {
  const [v, setV] = useState(value ?? '')
  const ref = useRef({ v, value, save }); ref.current = { v, value: value ?? '', save }
  useEffect(() => setV(value ?? ''), [value])
  const commit = () => { const r = ref.current; if (r.v !== r.value) r.save(r.v) }
  useEffect(() => () => commit(), [])  // eslint-disable-line
  return [v, setV, commit]
}

function useGraphBasics(d) {
  const byId = useMemo(() => Object.fromEntries(d.characters.map(c => [c.id, c])), [d.characters])
  const typesById = useMemo(() => Object.fromEntries(d.tieTypes.map(t => [t.id, t])), [d.tieTypes])
  return { byId, typesById }
}

/* ---------------- shared: two-way ties ---------------- */

// The tie that runs the other way between the same two characters (or repeats a two-way one), if any.
const twinOf = (ties, t) => t && ties.find(u => u.id !== t.id && (
  (u.from_character_id === t.to_character_id && u.to_character_id === t.from_character_id) ||
  ((t.both_ways || u.both_ways) && u.from_character_id === t.from_character_id && u.to_character_id === t.to_character_id)))
// Ties that have a twin, one per pair of characters.
const mergeable = ties => {
  const seen = new Set()
  return ties.filter(t => {
    const k = [t.from_character_id, t.to_character_id].sort().join('|')
    if (seen.has(k) || !twinOf(ties, t)) return false
    seen.add(k); return true
  })
}
const tieWords = (A, B, both) => both ? first(A) + ' and ' + first(B) + ' are…' : first(A) + ' is…'

function Direction({ both, onChange, platform }) {
  const size = platform === 'mobile' ? 'touch' : 'md'
  return (
    <div>
      <Eyebrow style={{ marginBottom: 8 }}>Direction</Eyebrow>
      <div role="group" aria-label="Direction" style={chipRow}>
        <Chip size={size} selected={!both} onClick={() => onChange(false)}>One way {'→'}</Chip>
        <Chip size={size} selected={both} onClick={() => onChange(true)}>Both ways {'↔'}</Chip>
      </div>
    </div>
  )
}

// Offered while a tie has a twin: merge the two into one two-way tie, keeping one set of words.
function MergeOffer({ twin, byId, mine, platform, onMerge }) {
  const m = platform === 'mobile'
  const theirs = (twin.label || '').trim()
  const options = [...new Set([(mine || '').trim(), theirs].filter(Boolean))]
  const [pick, setPick] = useState('')
  const chosen = options.includes(pick) ? pick : options[0] || ''
  const X = byId[twin.from_character_id], Y = byId[twin.to_character_id]
  if (!X || !Y) return null
  return (
    <Panel platform={platform} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        {first(X)} {twin.both_ways ? '↔' : '→'} {first(Y)} is drawn too{theirs ? <>: {'“'}{theirs}{'”'}</> : ''}. Merge the two into one two-way tie?
      </div>
      {options.length > 1 && (
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Keep which words?</Eyebrow>
          <div role="group" aria-label="Words to keep" style={chipRow}>
            {options.map(o => <Chip key={o} size={m ? 'touch' : 'md'} selected={chosen === o} onClick={() => setPick(o)}>{o}</Chip>)}
          </div>
        </div>
      )}
      <Button variant="subtle" platform={platform} onClick={() => onMerge(chosen)}>Merge into one tie</Button>
    </Panel>
  )
}

/* ---------------- shared: note cards and tagged highlights ---------------- */

// A character's notes as cards. Before the note-cards migration a character has one plain `notes` text instead.
const cardsOf = c => Array.isArray(c.note_cards) ? c.note_cards : (c.notes?.trim() ? [{ id: 'legacy', text: c.notes.trim(), page: null }] : [])

function NoteCards({ d, c, platform }) {
  const m = platform === 'mobile'
  const toast = useToast()
  const cards = cardsOf(c)
  const [edit, setEdit] = useState(null)   // { id (null for a new card), text, page }
  const [err, setErr] = useState('')
  const latest = useRef(c); latest.current = c
  const save = async next => {
    const e = await d.updateCharacter(c.id, { note_cards: next.map(x => (x.id === 'legacy' ? { ...x, id: uid() } : x)), notes: null })
    setErr(e || ''); return e
  }
  const open = x => { setErr(''); setEdit(x ? { id: x.id, text: x.text, page: x.page ? String(x.page) : '' } : { id: null, text: '', page: '' }) }
  const cancel = () => { setEdit(null); setErr('') }
  async function submit() {
    const text = edit.text.trim()
    if (!text) return setErr('Write the note first.')
    const card = { id: edit.id || uid(), text, page: edit.page ? Number(edit.page) : null }
    const was = edit
    setEdit(null)   // the card shows at once; the editor comes back with the text if the save fails
    if (await save(edit.id ? cards.map(x => (x.id === edit.id ? card : x)) : [...cards, card])) setEdit(was)
  }
  const move = (i, by) => { const next = cards.slice(); next.splice(i + by, 0, next.splice(i, 1)[0]); save(next) }
  function remove(x, i) {
    if (edit?.id === x.id) setEdit(null)
    save(cards.filter(y => y.id !== x.id))
    toast('Note removed', { undo: () => { const now = cardsOf(latest.current).slice(); now.splice(Math.min(i, now.length), 0, x); save(now) } })
  }
  const editor = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TextArea size={m ? 'lg' : 'md'} autoFocus value={edit?.text || ''} placeholder="What did you notice?" aria-label={edit?.id ? 'Edit note' : 'New note'}
        style={{ minHeight: 72, resize: 'vertical' }} onChange={e => { setEdit({ ...edit, text: e.target.value }); setErr('') }}
        onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() } }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextInput ground={m ? 'page' : 'card'} size={m ? 'lg' : 'md'} inputMode="numeric" placeholder="Page" aria-label="Page (optional)" style={{ width: 88 }}
          value={edit?.page || ''} onChange={e => setEdit({ ...edit, page: digits(e.target.value) })} />
        <span style={{ flex: 1 }} />
        <Button variant="subtle" platform={platform} onClick={cancel}>Cancel</Button>
        <Button onClick={submit}>{edit?.id ? 'Save' : 'Add note'}</Button>
      </div>
      {err && <ErrorText>{err}</ErrorText>}
    </div>
  )
  const card = (x, i) => edit?.id === x.id ? <Panel key={x.id} platform={platform}>{editor}</Panel> : (
    <Panel key={x.id} platform={platform} style={{ display: 'flex', alignItems: 'flex-start', gap: 2, padding: '6px 4px 6px 14px' }}>
      <button type="button" onClick={() => open(x)} aria-label={'Edit note: ' + x.text}
        style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '6px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, textAlign: 'left' }}>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{x.text}</span>
        {x.page ? <span className="app-meta">p. {x.page}</span> : null}
      </button>
      {cards.length > 1 && <>
        <IconButton platform={platform} muted label="Move note up" icon="chevron-down" iconSize={14} onClick={() => move(i, -1)}
          style={{ transform: 'rotate(180deg)', visibility: i > 0 ? 'visible' : 'hidden' }} />
        <IconButton platform={platform} muted label="Move note down" icon="chevron-down" iconSize={14} onClick={() => move(i, 1)}
          style={{ visibility: i < cards.length - 1 ? 'visible' : 'hidden' }} />
      </>}
      <IconButton platform={platform} muted label="Delete note" icon="trash-simple" iconSize={16} onClick={() => remove(x, i)} />
    </Panel>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }}>
        <Eyebrow>Notes{cards.length ? ' (' + cards.length + ')' : ''}</Eyebrow>
        {!(edit && !edit.id) && <TextButton onClick={() => open(null)}>+ Add note</TextButton>}
      </div>
      {cards.length === 0 && !edit && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No notes yet. Add the first thing you notice about {first(c)}.</div>}
      {cards.map(card)}
      {edit && !edit.id && <Panel platform={platform}>{editor}</Panel>}
      {err && !edit && <ErrorText>{err}</ErrorText>}
    </div>
  )
}

// Every highlight this character is tagged in, by page. Read-only here: choosing one opens it in Highlights.
function TaggedHighlights({ d, c, platform, onOpen }) {
  const m = platform === 'mobile'
  const list = d.highlights.filter(h => h.mentions?.includes(c.id)).sort((a, b) => a.page - b.page || (a.created_at > b.created_at ? 1 : -1))
  const labelOf = h => { const l = d.labels.find(x => x.id === h.label_id); return l ? { name: l.name, color: labelColor(l.color_index) } : { name: 'Unlabelled', color: UNLABELLED } }
  const others = h => h.mentions.filter(id => id !== c.id).map(id => d.characters.find(x => x.id === id)).filter(Boolean).map(first).join(', ')
  return (
    <div>
      <Eyebrow style={{ marginBottom: m ? 4 : 0 }}>Highlights{list.length ? ' (' + list.length + ')' : ''}</Eyebrow>
      {list.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '8px 0', lineHeight: 1.5 }}>
          No highlights tag {first(c)} yet. Pick {first(c)} under Who is in it? when you save a highlight and it shows up here.
        </div>
      )}
      {list.map(h => {
        const lb = labelOf(h), also = others(h)
        return m ? (
          <button key={h.id} type="button" onClick={() => onOpen(h.id)} aria-label={'Open the highlight on page ' + h.page + ' in Highlights'}
            style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', textAlign: 'left', padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>p. {h.page}</span><Dot color={lb.color} /><span style={{ color: 'var(--text-muted)' }}>{lb.name}</span>
            </span>
            {h.quote && <span className="app-quote" style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-quote)' }}>{'“'}{h.quote}{'”'}</span>}
            {h.note && <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{h.note}</span>}
            {also && <span style={{ fontSize: 12, color: 'var(--palette-blue)' }}>Also: {also}</span>}
          </button>
        ) : (
          <HighlightRow key={h.id} page={h.page} label={lb.name} labelColor={lb.color} quote={h.quote || null} note={h.note || null}
            mentions={also ? 'Also: ' + also : null} onOpen={() => onOpen(h.id)} />
        )
      })}
      {list.length > 0 && <div className="app-meta" style={{ marginTop: 8 }}>Choose one to open it on the Highlights tab.</div>}
    </div>
  )
}

const near = (ties, sel) => {
  const s = new Set(sel ? [sel] : [])
  if (sel) ties.forEach(t => { if (t.from_character_id === sel) s.add(t.to_character_id); if (t.to_character_id === sel) s.add(t.from_character_id) })
  return s
}

/* Tie types: swatch rows, add, and copy from another book. Used in the desktop popover and the phone sheet. */
function TypesManager({ d, platform, hidden, setHidden, bookId }) {
  const m = platform === 'mobile'
  const toast = useToast()
  const [name, setName] = useState(''), [err, setErr] = useState(''), [from, setFrom] = useState('')
  const names = useDraftNames(d.tieTypes, d.updateTieType, 'This book already has that tie type.')
  const others = useOtherBooks(bookId, true)
  async function add(e) {
    e && e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Give the tie type a name.')
    if (d.tieTypes.some(t => t.name.toLowerCase() === n.toLowerCase())) return setErr('This book already has that tie type.')
    const e2 = await d.addTieType(n); e2 ? setErr(e2) : (setName(''), setErr(''))
  }
  async function copy() {
    if (!from) return setErr('Choose a book to copy from.')
    const r = await d.copyTieTypes(from)
    if (r.err) return setErr(r.err)
    setFrom(''); setErr('')
    toast(r.n ? r.n + (r.n === 1 ? ' tie type' : ' tie types') + ' copied' : 'Nothing new to copy')
  }
  const count = t => d.ties.filter(x => x.tie_type_id === t.id).length
  const rows = d.tieTypes.map(t => {
    const on = !hidden.includes(t.id)
    return (
      <SwatchRow key={t.id} platform={platform} swatchSize={m ? 20 : 22} color={tieColor(t.color_index)} name={names.nameOf(t)} count={count(t)}
        onCycle={() => d.updateTieType(t.id, { color_index: (t.color_index + 1) % TIE_COLORS.length })}
        onRename={e => names.rename(t, e.target.value)} onRemove={() => d.removeTieType(t)}
        inputLabel="Tie type name" removeLabel={'Delete type ' + t.name}
        leading={m ? (
          <button type="button" className="de-ib" aria-label={(on ? 'Shown' : 'Hidden') + ': ' + t.name + '. Press to toggle'} aria-pressed={on}
            onClick={() => setHidden(h => on ? [...h, t.id] : h.filter(x => x !== t.id))} style={{ color: on ? 'var(--text)' : 'var(--border-emphasis)' }}>
            <Icon name="eye" size={20} />
          </button>
        ) : null} />
    )
  })
  return (
    <>
      <p style={{ margin: 0, fontSize: 13, lineHeight: m ? 1.5 : 1.55, color: 'var(--text-muted)' }}>
        {m ? 'Show or hide each kind of tie on the graph, change its colour, or rename it. These types belong to this book.'
          : 'Types colour and group the ties in ' + d.book.title + '. The words on each tie are yours.'}
      </p>
      {d.tieTypes.length === 0 && <EmptyState style={{ fontSize: 14 }}>No tie types yet. Add kinds like Family, Ally or Rival.</EmptyState>}
      <div style={m ? { display: 'contents' } : null}>{rows}</div>
      <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
        <TextInput ground={m ? 'page' : 'card'} size={m ? 'lg' : 'md'} style={{ flex: 1, minWidth: 0 }} placeholder="New type, for example Pawnbroker"
          aria-label="New tie type name" value={name} maxLength={60} onChange={e => { setName(e.target.value); setErr('') }} />
        <Button type="submit">Add</Button>
      </form>
      {(err || names.err) && <ErrorText>{err || names.err}</ErrorText>}
      {others.length > 0 && (
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: m ? 10 : 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Eyebrow>Copy types from another book</Eyebrow>
          <div style={{ display: 'flex', gap: 8, flexDirection: m ? 'row' : 'column' }}>
            <Select ground={m ? 'page' : 'card'} size={m ? 'lg' : 'md'} style={{ flex: 1, minWidth: 0 }} aria-label="Copy tie types from" value={from} onChange={e => { setFrom(e.target.value); setErr('') }}>
              <option value="">Choose a book</option>
              {others.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </Select>
            <Button variant="subtle" platform={platform} onClick={copy}>{m ? 'Copy' : 'Copy missing types'}</Button>
          </div>
        </div>
      )}
    </>
  )
}

/* ---------------- desktop ---------------- */

function DeskGraph({ d, header, onOpenHighlight }) {
  const toast = useToast()
  const { byId, typesById } = useGraphBasics(d)
  const [sel, setSel] = useState(null), [selTie, setSelTie] = useState(null)
  const [pop, setPop] = useState(null)              // { mode: 'tie' | 'types', isNew }
  const [drawer, setDrawer] = useState(null)        // 'add' | 'char'
  const [hidden, setHidden] = useState([])
  const [draw, setDraw] = useState(null)            // { from, x, y }
  const [ltype, setLtype] = useState(null)          // last tie type picked, used for new ties
  const [hint, setHint] = useState(readTip)
  const lastTap = useRef({ id: null, t: 0 })
  const fitted = useRef(false)

  useEffect(() => { if (sel && !byId[sel]) setSel(null) }, [byId, sel])
  useEffect(() => { if (selTie && !d.ties.some(t => t.id === selTie)) { setSelTie(null); setPop(p => (p?.mode === 'tie' ? null : p)) } }, [d.ties, selTie])

  // Which node a point (world coords) is over, if any.
  const hit = (p, except) => p && d.characters.find(c => c.id !== except && Math.abs(p.x - c.x) <= DESK.hw + 8 && Math.abs(p.y - c.y) <= DESK.hh + 6)?.id

  const cv = useCanvas({
    min: 0.2, max: 2.5, fitPad: { padX: 130, padY: 80 },
    classify: t => {
      const h = t.closest('[data-handle]'); if (h) return { type: 'handle', id: h.dataset.handle }
      const n = t.closest('[data-node]'); if (n) { const c = byId[n.dataset.node]; return { type: 'node', id: c.id, pos: { x: c.x, y: c.y } } }
      if (t.closest('button,input,select,textarea,a,.de-popover,.de-canvasbar')) return { type: 'ui' }
      return { type: 'bg' }
    },
    onTap: s => {
      if (s.type === 'node') {
        const now = Date.now(), dbl = lastTap.current.id === s.id && now - lastTap.current.t < 380
        lastTap.current = dbl ? { id: null, t: 0 } : { id: s.id, t: now }
        closePop(); setSel(s.id); setSelTie(null)
        if (dbl) setDrawer('char')
      } else if (s.type === 'bg') { closePop(); setSel(null); setSelTie(null) }
    },
    onDrag: (id, p) => { if (sel !== id) { setSel(id); setSelTie(null) } d.setPositions({ [id]: p }) },
    onDraw: (from, p) => { closePop(); setSel(from); setSelTie(null); setDraw({ from, x: p.x, y: p.y }) },
    onDrawEnd: (from, p) => { const to = hit(p, from); setDraw(null); if (to) newTie(from, to) },
  })
  const { view, size } = cv

  useEffect(() => { if (!fitted.current && size.W && d.characters.length) { fitted.current = true; cv.fit(d.characters) } }, [size.W, d.characters.length])  // eslint-disable-line

  async function newTie(from, to) {
    const type = (ltype && typesById[ltype]) ? ltype : d.tieTypes[0]?.id || null
    const r = await d.addTie(from, to, type, '')
    if (r.err) return toast(r.err)
    setDrawer(null); setSel(from); setSelTie(r.id); setPop({ mode: 'tie', isNew: true })
  }
  function closePop() {
    if (pop?.isNew && selTie) { const t = d.ties.find(x => x.id === selTie); if (t && !t.label) d.removeTie(t, { quiet: true }) }
    setPop(null)
  }
  function arrange() {
    const pos = autoArrange(d.characters, d.ties)
    d.setPositions(pos)
    cv.fit(d.characters.map(c => ({ ...c, ...pos[c.id] })))
  }

  const visible = d.ties.filter(t => !hidden.includes(t.tie_type_id || ''))
  const edges = deskEdges(byId, visible, typesById, sel, selTie, first)
  const nb = near(d.ties, sel)
  const tgt = draw && hit(draw, draw.from)
  let drawPath = null
  if (draw && byId[draw.from]) {
    const F = byId[draw.from], endRaw = tgt ? byId[tgt] : draw
    drawPath = arrow(clip(F, endRaw), tgt ? clip(byId[tgt], F) : endRaw)
  }
  const selC = sel && byId[sel], tie = selTie && d.ties.find(t => t.id === selTie)
  const hasUntyped = d.ties.some(t => !t.tie_type_id || !typesById[t.tie_type_id])
  const typeChips = d.tieTypes.map(t => ({ id: t.id, name: t.name, color: tieColor(t.color_index) }))
    .concat(hasUntyped ? [{ id: '', name: 'Untyped', color: TIE_UNTYPED.color }] : [])
  const pairs = mergeable(d.ties)
  const reviewPair = () => { const t = pairs[0]; closePop(); setDrawer(null); setSel(t.from_character_id); setSelTie(t.id); setPop({ mode: 'tie', isNew: false }) }
  const popEdge = tie && edges.find(e => e.id === tie.id)
  const tieOn = pop?.mode === 'tie' && !!tie, typesOn = pop?.mode === 'types' || (pop?.mode === 'tie' && !tie)
  const POPW = 380
  const pLeft = tieOn && popEdge ? Math.round(Math.min(Math.max(8, popEdge.mx * view.k + view.tx - POPW / 2), size.W - POPW - 8)) : Math.round(Math.max(8, (size.W - POPW) / 2))
  const pTop = tieOn && popEdge ? Math.round(Math.min(Math.max(8, popEdge.my * view.k + view.ty + 22), Math.max(8, size.H - 400))) : 24

  return (
    <>
      {header(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => { setDrawer(null); setPop({ mode: 'types' }) }}>Manage tie types</Button>
          <Button icon="plus" onClick={() => setDrawer('add')}>Add character</Button>
        </div>
      )}
      <div style={{ marginTop: 22 }}>
        {hint && <HintBar onDismiss={() => { hideTip(); setHint(false) }}>Click a character to see its ties. Double-click, or use Edit card below, to open it. Drag from the green handle to draw a tie.</HintBar>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }} role="group" aria-label="Show ties">
          <Eyebrow as="span" style={{ marginRight: 4 }}>Show ties</Eyebrow>
          {typeChips.length === 0 && <span className="app-meta">No tie types yet. Use Manage tie types to add some.</span>}
          {typeChips.map(t => {
            const on = !hidden.includes(t.id)
            return <Chip key={t.id || 'untyped'} selected={on} dot={t.color} onClick={() => setHidden(h => on ? [...h, t.id] : h.filter(x => x !== t.id))}>{t.name}</Chip>
          })}
        </div>
        {pairs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <span className="app-meta">{pairs.length === 1 ? 'Two characters have' : pairs.length + ' pairs of characters have'} a tie drawn each way. You can merge {pairs.length === 1 ? 'them' : 'each pair'} into one two-way tie.</span>
            <TextButton onClick={reviewPair}>{pairs.length === 1 ? 'Review' : 'Review the first'}</TextButton>
          </div>
        )}
        <div ref={cv.ref} {...cv.handlers} style={{ touchAction: 'none' }}>
        <GraphCanvas framed
          style={{ backgroundSize: 22 * view.k + 'px ' + 22 * view.k + 'px', backgroundPosition: view.tx + 'px ' + view.ty + 'px', cursor: draw ? 'crosshair' : 'grab' }}>
          {d.characters.length === 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '40%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, padding: '0 24px', pointerEvents: 'none' }}>
              No characters in this book yet.<br />Choose Add character to start your graph.
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${view.tx}px,${view.ty}px) scale(${view.k})`, transformOrigin: '0 0' }}>
            <svg aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}>
              {edges.map(e => <path key={'l' + e.id} d={e.d} style={{ fill: 'none', stroke: e.color, strokeWidth: e.w, strokeDasharray: e.dash, strokeLinecap: 'round', opacity: e.op }} />)}
              {edges.map(e => <path key={'h' + e.id} d={e.head} style={{ fill: e.color, stroke: e.color, strokeWidth: 1, strokeLinejoin: 'round', opacity: e.op }} />)}
              {drawPath && <>
                <path d={drawPath.line} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 3, strokeDasharray: '6 5', strokeLinecap: 'round' }} />
                <path d={drawPath.head} style={{ fill: 'var(--accent)', stroke: 'var(--accent)', strokeWidth: 1, strokeLinejoin: 'round' }} />
              </>}
            </svg>
            {edges.map(e => (
              <TieLabel key={'t' + e.id} x={e.mx} y={e.my} color={e.color} opacity={e.op} aria-label={(e.both ? 'Two-way tie between ' + e.fromName + ' and ' : 'Tie from ' + e.fromName + ' to ') + e.toName + ': ' + e.label + '. Edit'}
                onClick={() => { closePop(); setSelTie(e.id); setDrawer(null); setPop({ mode: 'tie', isNew: false }) }}>{e.label}</TieLabel>
            ))}
            {d.characters.map((c, i) => (
              <CharacterNode key={c.id} x={c.x} y={c.y} name={c.name} first={first(c)} job={c.profession || ''} initial={first(c).charAt(0).toUpperCase()}
                avatar={avatarColor(i)} ring={c.id === tgt ? 'var(--on-avatar)' : c.id === sel ? 'var(--accent)' : 'var(--border-strong)'}
                opacity={!sel || nb.has(c.id) ? 1 : 0.3}
                nodeProps={{ 'data-node': c.id, onClick: e => { if (e.detail === 0) { setSel(c.id); setSelTie(null); setDrawer('char') } }, onDoubleClick: () => setDrawer('char') }}
                handleProps={{ 'data-handle': c.id, onClick: e => { if (e.detail === 0) { setSel(c.id); setSelTie(null); setDrawer('char') } } }} />
            ))}
          </div>
          {pop && (
            <Popover label="Tie" style={{ left: pLeft, top: pTop, maxHeight: Math.max(200, size.H - pTop - 8) }}>
              <div className="de-popover__tabs">
                {tie && <Tab selected={tieOn} onClick={() => setPop(p => ({ ...p, mode: 'tie' }))} style={{ marginRight: 12 }}>This tie</Tab>}
                <Tab selected={typesOn} onClick={() => setPop(p => ({ ...p, mode: 'types' }))} style={{ marginRight: 0 }}>Manage tie types</Tab>
                <span style={{ flex: 1 }} />
                <IconButton label="Close" onClick={closePop} style={{ width: 40, height: 40 }} />
              </div>
              {tieOn && <TiePanel key={tie.id} d={d} tie={tie} byId={byId} isNew={pop.isNew} onPickType={setLtype} onMerged={() => setPop(p => p && { ...p, isNew: false })}
                onDone={() => setPop(null)} onCancel={closePop} onRemove={() => { setPop(null); setSelTie(null); d.removeTie(tie) }} />}
              {typesOn && (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <TypesManager d={d} platform="desktop" hidden={hidden} setHidden={setHidden} bookId={d.book.id} />
                  <Button onClick={() => setPop(null)}>Done</Button>
                </div>
              )}
            </Popover>
          )}
          <CanvasToolbar zoom={Math.round(view.k * 100) + '%'} onZoomIn={() => cv.zoomAt(1.25)} onZoomOut={() => cv.zoomAt(1 / 1.25)}
            onFit={() => cv.fit(d.characters)} onArrange={arrange} />
        </GraphCanvas>
        </div>
        {selC && (
          <SelectionBar>
            <span><b style={{ color: 'var(--text)' }}>{selC.name}</b> selected</span>
            <Button variant="subtle" onClick={() => setDrawer('char')}>Edit card</Button>
            <Button variant="subtle" tone="danger" onClick={() => { setSel(null); d.removeCharacter(selC) }}>Remove</Button>
          </SelectionBar>
        )}
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Drag the canvas to pan. Ctrl or {'⌘'} + scroll to zoom.</p>
      </div>

      {drawer === 'add' && <AddCharDrawer d={d} onClose={() => setDrawer(null)}
        at={() => ({ x: (size.W / 2 - view.tx) / view.k + (Math.random() - 0.5) * 80, y: (size.H / 2 - view.ty) / view.k + (Math.random() - 0.5) * 80 })}
        onAdded={id => { setSel(id); setSelTie(null); setDrawer('char') }} />}
      {drawer === 'char' && selC && <CharDrawer key={selC.id} d={d} c={selC} byId={byId} typesById={typesById} onClose={() => setDrawer(null)} onOpenHighlight={onOpenHighlight}
        onOpenTie={id => { setDrawer(null); setSelTie(id); setPop({ mode: 'tie', isNew: false }) }}
        onJump={id => { setSel(id); setSelTie(null) }} onTie={to => newTie(selC.id, to)}
        onRemove={() => { setDrawer(null); setSel(null); d.removeCharacter(selC) }} />}
    </>
  )
}

function TiePanel({ d, tie, byId, isNew, onPickType, onDone, onCancel, onRemove, onMerged }) {
  const A = byId[tie.from_character_id], B = byId[tie.to_character_id]
  const [label, setLabel, commit] = useSaved(tie.label, v => d.updateTie(tie.id, { label: v.trim() }))
  const used = [...new Set(d.ties.filter(t => t.id !== tie.id && t.label).map(t => t.label))].slice(0, 8)
  const types = d.tieTypes.map(t => ({ id: t.id, name: t.name, color: tieColor(t.color_index) })).concat([{ id: null, name: 'Untyped', color: TIE_UNTYPED.color }])
  const done = () => { commit(); onDone() }
  const both = !!tie.both_ways, twin = twinOf(d.ties, tie)
  if (!A || !B) return null
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 36 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{first(A)} {both ? '↔' : '→'} {first(B)}</div>
        {!both && <Button variant="subtle" size="sm" onClick={() => d.updateTie(tie.id, { from_character_id: tie.to_character_id, to_character_id: tie.from_character_id })}>Swap</Button>}
      </div>
      <Direction both={both} onChange={v => d.updateTie(tie.id, { both_ways: v })} />
      {twin && <MergeOffer key={twin.id} twin={twin} byId={byId} mine={label} platform="desktop" onMerge={l => { d.mergeTies(tie, twin, l); setLabel(l); onMerged() }} />}
      <Field label={tieWords(A, B, both)}>
        <TextInput value={label} maxLength={80} placeholder={both ? 'For example, rivals' : 'For example, mentor of'} autoFocus onChange={e => setLabel(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); done() } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() } }} />
      </Field>
      {used.length > 0 && (
        <div style={chipRow}>
          {used.map(l => <Chip key={l} aria-pressed={undefined} onClick={() => { setLabel(l); d.updateTie(tie.id, { label: l }) }} style={{ minHeight: 32, padding: '0 12px' }}>{l}</Chip>)}
        </div>
      )}
      <div>
        <Eyebrow style={{ marginBottom: 8 }}>Tie type</Eyebrow>
        <div role="group" aria-label="Tie type" style={chipRow}>
          {types.map(t => <Chip key={t.id || 'untyped'} selected={(tie.tie_type_id || null) === t.id} dot={t.color} style={{ minHeight: 34 }}
            onClick={() => { d.updateTie(tie.id, { tie_type_id: t.id }); onPickType(t.id) }}>{t.name}</Chip>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={done}>Done</Button>
        {isNew ? <Button variant="subtle" onClick={onCancel}>Cancel</Button> : <Button variant="subtle" tone="danger" onClick={onRemove}>Remove tie</Button>}
      </div>
    </div>
  )
}

function AddCharDrawer({ d, at, onClose, onAdded }) {
  const [name, setName] = useState(''), [job, setJob] = useState(''), [err, setErr] = useState('')
  async function add(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Add a name for this character.')
    if (d.characters.some(c => c.name.toLowerCase() === n.toLowerCase())) return setErr('You already have a character called ' + n + '.')
    const r = await d.addCharacter({ name: n, profession: job.trim() || null }, at())
    r.err ? setErr(r.err) : onAdded(r.id)
  }
  return (
    <FormOverlay title={'Add to ' + d.book.title} onClose={onClose}>
      <form onSubmit={add} noValidate style={{ display: 'contents' }}>
        <Field label="Name"><TextInput value={name} maxLength={120} invalid={!!err} placeholder="For example, Ines Calloway" onChange={e => { setName(e.target.value); setErr('') }} /></Field>
        {err && <ErrorText>{err}</ErrorText>}
        <Field label="Role or job"><TextInput value={job} placeholder="Optional" onChange={e => setJob(e.target.value)} /></Field>
        <Button type="submit">Add character</Button>
      </form>
    </FormOverlay>
  )
}

function CharDrawer({ d, c, byId, typesById, onClose, onOpenTie, onJump, onTie, onRemove, onOpenHighlight }) {
  const save = k => v => d.updateCharacter(c.id, { [k]: v })
  const [nm, setNm, commitName] = useSaved(c.name, v => { const t = v.trim(); if (t) d.updateCharacter(c.id, { name: t }); else setNm(c.name) })
  const [job, setJob, commitJob] = useSaved(c.profession, v => save('profession')(v.trim() || null))
  const [pg, setPg, commitPg] = useSaved(c.first_page ? String(c.first_page) : '', v => save('first_page')(v ? Number(v) : null))
  const [aka, setAka] = useState(''), [to, setTo] = useState(''), [renaming, setRenaming] = useState(false)
  const aliases = c.aliases || []
  const addAka = e => { e.preventDefault(); const v = aka.trim(); if (v && !aliases.includes(v)) d.updateCharacter(c.id, { aliases: [...aliases, v] }); setAka('') }
  const rels = d.ties.filter(t => t.from_character_id === c.id || t.to_character_id === c.id).map(t => {
    const out = t.from_character_id === c.id, o = byId[out ? t.to_character_id : t.from_character_id], ts = typeStyle(typesById, t.tie_type_id), lb = t.label || 'untitled tie'
    if (!o) return null
    return { t, o, ts, text: t.both_ways ? '↔ ' + first(c) + ' and ' + first(o) + ': ' + lb : out ? '→ ' + first(c) + ' ' + lb + ' ' + first(o) : '← ' + first(o) + ' ' + lb + ' ' + first(c) }
  }).filter(Boolean)
  return (
    <FormOverlay title="Character" onClose={onClose} focus={false} label={c.name}>
      {renaming
        ? <Field label="Name"><TextInput value={nm} autoFocus maxLength={120} onChange={e => setNm(e.target.value)} onBlur={() => { commitName(); setRenaming(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} /></Field>
        : <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 className="desktop-drawer-title" style={{ margin: 0, letterSpacing: '-0.02em' }}>{c.name}</h2>
          <Button variant="subtle" size="sm" onClick={() => setRenaming(true)}>Rename</Button>
        </div>}
      <div>
        <div style={chipRow}>
          {aliases.map(a => (
            <span key={a} style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface-raised)', borderRadius: 999, padding: '2px 2px 2px 12px', fontSize: 13 }}>
              {a}<button type="button" onClick={() => d.updateCharacter(c.id, { aliases: aliases.filter(x => x !== a) })} aria-label={'Remove alias ' + a}
                style={{ width: 36, height: 36, borderRadius: '50%', color: 'var(--text-muted)', textAlign: 'center' }}>{'×'}</button>
            </span>
          ))}
        </div>
        <form onSubmit={addAka} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <TextInput style={{ flex: 1, minWidth: 0 }} value={aka} onChange={e => setAka(e.target.value)} placeholder="Add another name" aria-label="New alias" />
          <Button variant="subtle" type="submit">Add</Button>
        </form>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Role or job" style={{ flex: 1 }}><TextInput value={job} onChange={e => setJob(e.target.value)} onBlur={commitJob} /></Field>
        <Field label="First seen, page"><TextInput pageNumber inputMode="numeric" value={pg} onChange={e => setPg(digits(e.target.value))} onBlur={commitPg} /></Field>
      </div>
      <NoteCards d={d} c={c} platform="desktop" />
      <TaggedHighlights d={d} c={c} platform="desktop" onOpen={onOpenHighlight} />
      <div>
        <Eyebrow style={{ marginBottom: 6 }}>Ties</Eyebrow>
        {rels.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-muted)', padding: '8px 0' }}>No ties yet. Drag from the green handle on the graph, or add one below.</div>}
        {rels.map(r => (
          <div key={r.t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--divider)' }}>
            <button type="button" onClick={() => onOpenTie(r.t.id)} aria-label={'Edit tie with ' + r.o.name}
              style={{ flex: 1, minWidth: 0, minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Dot color={r.ts.color} /><span style={{ fontWeight: 700, fontSize: 14 }}>{r.text}</span></span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 18 }}>{r.o.name} {'·'} {r.ts.name}</span>
            </button>
            <Button variant="subtle" size="sm" onClick={() => onJump(r.o.id)}>Open</Button>
          </div>
        ))}
      </div>
      {d.characters.length > 1 && (
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow>Add a tie from {first(c)}</Eyebrow>
          <Select aria-label="Tie to" value={to} onChange={e => setTo(e.target.value)}>
            <option value="">Choose a character</option>
            {d.characters.filter(o => o.id !== c.id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
          <Button variant="subtle" onClick={() => to && onTie(to)}>Add tie</Button>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>You can also drag from the green handle on the graph.</div>
        </Panel>
      )}
      <Button variant="subtle" tone="danger" onClick={onRemove}>Remove character</Button>
    </FormOverlay>
  )
}

/* ---------------- phone ---------------- */

function PhoneGraph({ d, onOpenHighlight }) {
  const toast = useToast()
  const { byId, typesById } = useGraphBasics(d)
  const [sel, setSel] = useState(null), [link, setLink] = useState(false)
  const [sheet, setSheet] = useState(null)   // { kind: 'tie', draft } | { kind: 'edit', form } | { kind: 'types' }
  const [hidden, setHidden] = useState([])
  const [hint, setHint] = useState(readTip)
  const fitted = useRef(false)
  useEffect(() => { if (sel && !byId[sel]) { setSel(null); setLink(false) } }, [byId, sel])

  const cv = useCanvas({
    min: 0.35, max: 1.8, initialK: 0.82, fitPad: { padX: PHONE.w / 2 + 20, padY: PHONE.h / 2 + 20 },
    classify: t => {
      const n = t.closest('[data-node]'); if (n) { const c = byId[n.dataset.node]; return { type: 'node', id: c.id, pos: { x: c.x, y: c.y } } }
      if (t.closest('button,input,select,textarea,a,.de-banner,.de-graphctl')) return { type: 'ui' }
      return { type: 'bg' }
    },
    onTap: s => {
      if (s.type === 'node') {
        if (link && sel) {
          if (s.id === sel) return
          setLink(false)
          return setSheet({ kind: 'tie', draft: { a: sel, b: s.id, type: d.tieTypes[0]?.id || null, label: '', both: false } })
        }
        setSel(s.id); setSheet(null)
      } else if (s.type === 'bg' && !link) setSel(null)
    },
    onDrag: (id, p) => d.setPositions({ [id]: p }),
    onDraw: () => {}, onDrawEnd: () => {},
  })
  const { view, size } = cv
  // First view: centred on the cast at the design's 82%, or less (not below 60%, where names stop being readable).
  useEffect(() => {
    if (fitted.current || !size.W || !d.characters.length) return
    fitted.current = true
    const f = fitView(d.characters, size.W, size.H, { padX: PHONE.w / 2 + 20, padY: PHONE.h / 2 + 20, min: 0.35, max: 1.8 })
    const k = Math.min(0.82, Math.max(0.6, f.k)), cx = (size.W / 2 - f.tx) / f.k, cy = (size.H / 2 - f.ty) / f.k
    cv.setView({ k, tx: size.W / 2 - cx * k, ty: size.H / 2 - cy * k })
  }, [size.W, d.characters.length])  // eslint-disable-line

  const selC = sel && byId[sel]
  const nb = near(d.ties, sel)
  const picking = link && selC
  const edges = d.ties.filter(t => !hidden.includes(t.tie_type_id || '')).map(t => {
    const a = byId[t.from_character_id], b = byId[t.to_character_id]
    if (!a || !b) return null
    const ts = typeStyle(typesById, t.tie_type_id)
    return { id: t.id, ...phoneEdge(a, b, !!t.both_ways), color: ts.color, dash: ts.dash, label: t.label || ts.name, op: !sel || t.from_character_id === sel || t.to_character_id === sel ? 1 : 0.15 }
  }).filter(Boolean)
  const arrange = () => {
    const n = d.characters.length, R = Math.max(110, n * 34), pos = {}
    d.characters.forEach((c, i) => { pos[c.id] = { x: Math.round(200 + R * Math.cos(i / n * 2 * Math.PI - Math.PI / 2)), y: Math.round(242 + R * Math.sin(i / n * 2 * Math.PI - Math.PI / 2)) } })
    d.setPositions(pos)
    cv.fit(d.characters.map(c => ({ ...c, ...pos[c.id] })))
  }
  const center = () => ({ x: (size.W / 2 - view.tx) / view.k + (Math.random() - 0.5) * 60, y: (size.H / 2 - view.ty) / view.k + (Math.random() - 0.5) * 60 })
  const editForm = c => ({ id: c?.id || '', name: c?.name || '', job: c?.profession || '', aka: (c?.aliases || []).join(', '), page: c?.first_page ? String(c.first_page) : '' })

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {hint && <HintBar platform="mobile" onDismiss={() => { hideTip(); setHint(false) }}>Tap a character to see its ties, then Edit or Link to. Drag a character to move it, or the background to pan. Ties opens tie types.</HintBar>}
      <div ref={cv.ref} {...cv.handlers} style={{ flex: 1, minHeight: 0, marginTop: 12, display: 'flex', touchAction: 'none' }}>
      <GraphCanvas style={{ flex: 1, minHeight: 0, cursor: 'grab',
        backgroundSize: 22 * view.k + 'px ' + 22 * view.k + 'px', backgroundPosition: view.tx + 'px ' + view.ty + 'px' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${view.tx}px,${view.ty}px) scale(${view.k})` }}>
          <svg width="1" height="1" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
            {edges.map(e => (
              <g key={e.id} opacity={e.op}>
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="2" strokeDasharray={e.dash} />
                <polygon points={e.head} fill={e.color} />
                {e.tail && <polygon points={e.tail} fill={e.color} />}
                <text x={e.lx} y={e.ly} textAnchor="middle" fontSize="11" fontWeight="700" fill={e.color} stroke="var(--surface)" strokeWidth="4" paintOrder="stroke"
                  style={{ fontFamily: 'var(--font-sans)' }}>{e.label}</text>
              </g>
            ))}
          </svg>
          {d.characters.map(c => (
            <NodePill key={c.id} data-node={c.id} x={c.x - PHONE.w / 2} y={c.y - PHONE.h / 2} aria-label={c.name}
              ring={c.id === sel ? 'var(--accent)' : 'var(--border-strong)'} opacity={!sel || nb.has(c.id) || picking ? 1 : 0.3}
              onClick={e => { if (e.detail === 0) { if (picking && c.id !== sel) { setLink(false); setSheet({ kind: 'tie', draft: { a: sel, b: c.id, type: d.tieTypes[0]?.id || null, label: '', both: false } }) } else setSel(c.id) } }}>
              {c.name}
            </NodePill>
          ))}
        </div>
        {d.characters.length === 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '36%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, padding: '0 32px', pointerEvents: 'none' }}>
            No characters yet.<br />Tap the plus button to add the first one.
          </div>
        )}
        {picking && (
          <ActionBanner style={{ position: 'absolute', left: 10, right: 64, top: 10, zIndex: 3 }}
            action={<Button variant="subtle" platform="mobile" style={{ borderColor: 'var(--on-accent)', minHeight: 36 }} onClick={() => setLink(false)}>Cancel</Button>}>
            Tap who {first(selC)} is tied to
          </ActionBanner>
        )}
        <GraphControls hiddenDot={hidden.length > 0} onTypes={() => { setSel(null); setLink(false); setSheet({ kind: 'types' }) }}
          onZoomIn={() => cv.zoomAt(1.2)} onZoomOut={() => cv.zoomAt(1 / 1.2)} onFit={() => cv.fit(d.characters)} onArrange={arrange} />
        {!sel && !sheet && <Fab label="Add character" onClick={() => setSheet({ kind: 'edit', form: editForm(null) })} />}
      </GraphCanvas>
      </div>

      {selC && !link && !sheet && <CharSheet key={selC.id} d={d} c={selC} byId={byId} typesById={typesById} onClose={() => setSel(null)} onOpenHighlight={onOpenHighlight}
        onTie={t => setSheet({ kind: 'tie', draft: { id: t.id, a: t.from_character_id, b: t.to_character_id, type: t.tie_type_id, label: t.label || '', both: !!t.both_ways } })}
        onLink={() => setLink(true)} onEdit={() => setSheet({ kind: 'edit', form: editForm(selC) })}
        onRemove={() => { setSel(null); d.removeCharacter(selC) }} />}
      {sheet?.kind === 'tie' && <TieSheet d={d} draft={sheet.draft} byId={byId} onClose={() => setSheet(null)} toast={toast} />}
      {sheet?.kind === 'edit' && <EditCharSheet d={d} form={sheet.form} at={center} toast={toast} onClose={() => setSheet(null)} onAdded={id => setSel(id)} />}
      {sheet?.kind === 'types' && (
        <FormOverlay kind="sheet" tall title="Tie types" onClose={() => setSheet(null)} focus={false}
          actions={hidden.length ? <Button variant="subtle" platform="mobile" style={{ minHeight: 40 }} onClick={() => setHidden([])}>Show all</Button> : null}>
          <TypesManager d={d} platform="mobile" hidden={hidden} setHidden={setHidden} bookId={d.book.id} />
        </FormOverlay>
      )}
    </div>
  )
}

function CharSheet({ d, c, byId, typesById, onClose, onTie, onLink, onEdit, onRemove, onOpenHighlight }) {
  const rels = d.ties.filter(t => t.from_character_id === c.id || t.to_character_id === c.id).map(t => {
    const out = t.from_character_id === c.id, o = byId[out ? t.to_character_id : t.from_character_id], ts = typeStyle(typesById, t.tie_type_id)
    return o && { t, color: ts.color, text: (t.both_ways ? c.name + ' ↔ ' + o.name : out ? c.name + ' → ' + o.name : o.name + ' → ' + c.name) + ' · ' + ts.name }
  }).filter(Boolean)
  return (
    <FormOverlay kind="sheet" tall label={c.name} onClose={onClose} focus={false} head={
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mobile-sheet-name" style={{ letterSpacing: '-0.01em' }}>{c.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{[c.profession, c.first_page && 'First on page ' + c.first_page].filter(Boolean).join(' · ')}</div>
        </div>
        <IconButton platform="mobile" label="Close" onClick={onClose} />
      </div>}>
      {c.aliases?.length > 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Also known as {c.aliases.join(', ')}</div>}
      <NoteCards d={d} c={c} platform="mobile" />
      <Eyebrow style={{ marginTop: 4 }}>Ties</Eyebrow>
      {rels.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No ties yet. Use Link to{'…'} to connect this character.</div>}
      {rels.map(r => (
        <button key={r.t.id} type="button" onClick={() => onTie(r.t)} aria-label={'Edit tie: ' + r.text}
          style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, width: '100%', fontSize: 14 }}>
          <Dot size={10} color={r.color} /><span style={{ flex: 1, minWidth: 0 }}>{r.text}</span><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Edit</span>
        </button>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {d.characters.length > 1 && <Button onClick={onLink}>Link to{'…'}</Button>}
        <Button variant="subtle" platform="mobile" onClick={onEdit}>Edit</Button>
        <Button variant="subtle" platform="mobile" tone="danger" onClick={onRemove}>Remove</Button>
      </div>
      <TaggedHighlights d={d} c={c} platform="mobile" onOpen={onOpenHighlight} />
    </FormOverlay>
  )
}

function TieSheet({ d, draft, byId, onClose, toast }) {
  const [t, setT] = useState(draft), [err, setErr] = useState('')
  const A = byId[t.a], B = byId[t.b]
  const types = d.tieTypes.map(x => ({ id: x.id, name: x.name, color: tieColor(x.color_index) })).concat([{ id: null, name: 'Untyped', color: TIE_UNTYPED.color }])
  async function save() {
    const body = { from_character_id: t.a, to_character_id: t.b, tie_type_id: t.type || null, label: t.label.trim(), both_ways: !!t.both }
    if (t.id) { const e = await d.updateTie(t.id, body); if (e) return setErr(e); toast('Tie updated') }
    else { const r = await d.addTie(t.a, t.b, t.type, t.label.trim(), !!t.both); if (r.err) return setErr(r.err); toast('Tie saved') }
    onClose()
  }
  // a saved tie with one drawn back the other way can be merged with it
  const saved = t.id && d.ties.find(x => x.id === t.id)
  const twin = saved && twinOf(d.ties, { ...saved, from_character_id: t.a, to_character_id: t.b, both_ways: !!t.both })
  function merge(label) {
    if ((saved.tie_type_id || null) !== (t.type || null)) d.updateTie(t.id, { tie_type_id: t.type || null })
    d.mergeTies(saved, twin, label); onClose()
  }
  if (!A || !B) return null
  return (
    <FormOverlay kind="sheet" label="Choose tie type" onClose={onClose} focus={false} head={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.id ? 'Edit tie' : 'New tie'}</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{A.name} {t.both ? '↔' : '→'} {B.name}</div>
        </div>
        {t.id && !t.both && <Button variant="subtle" platform="mobile" onClick={() => setT({ ...t, a: t.b, b: t.a })} aria-label="Swap direction of the tie">Swap</Button>}
        <IconButton platform="mobile" label="Close" onClick={onClose} />
      </div>}>
      <Eyebrow>Tie type</Eyebrow>
      <div role="group" aria-label="Tie type" style={chipRow}>
        {types.map(x => <Chip key={x.id || 'untyped'} size="touch" selected={(t.type || null) === x.id} dot={x.color} onClick={() => setT({ ...t, type: x.id })}>{x.name}</Chip>)}
      </div>
      <Direction platform="mobile" both={!!t.both} onChange={v => setT({ ...t, both: v })} />
      <Field platform="mobile" label={tieWords(A, B, t.both) + ' (optional)'}>
        <TextInput ground="page" size="lg" value={t.label} maxLength={80} onChange={e => setT({ ...t, label: e.target.value })} placeholder={t.both ? 'For example, rivals' : 'For example, owes a debt to'} />
      </Field>
      {twin && <MergeOffer key={twin.id} twin={twin} byId={byId} mine={t.label} platform="mobile" onMerge={merge} />}
      {err && <ErrorText>{err}</ErrorText>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button style={{ flex: 1 }} onClick={save}>Save tie</Button>
        <Button variant="subtle" platform="mobile" onClick={onClose}>Cancel</Button>
        {t.id && <Button variant="subtle" platform="mobile" tone="danger" onClick={() => { onClose(); d.removeTie(d.ties.find(x => x.id === t.id)) }}>Remove</Button>}
      </div>
    </FormOverlay>
  )
}

function EditCharSheet({ d, form, at, toast, onClose, onAdded }) {
  const [f, setF] = useState(form), [err, setErr] = useState('')
  const put = p => { setF(x => ({ ...x, ...p })); setErr('') }
  async function save() {
    const name = f.name.trim()
    if (!name) return setErr('Add a name for this character.')
    if (d.characters.some(c => c.id !== f.id && c.name.toLowerCase() === name.toLowerCase())) return setErr('You already have a character called ' + name + '.')
    const body = { name, profession: f.job.trim() || null, aliases: f.aka.split(',').map(x => x.trim()).filter(Boolean), first_page: f.page ? Number(f.page) : null }
    if (f.id) { const e = await d.updateCharacter(f.id, body); if (e) return setErr(e); toast('Details saved'); onClose() }
    else { const r = await d.addCharacter(body, at()); if (r.err) return setErr(r.err); toast(name + ' added'); onClose(); onAdded(r.id) }
  }
  return (
    <FormOverlay kind="sheet" tall title={f.id ? 'Edit character' : 'New character'} label="Character details" onClose={onClose}>
      <Field platform="mobile" label="Name"><TextInput ground="page" size="lg" invalid={!!err} value={f.name} maxLength={120} onChange={e => put({ name: e.target.value })} /></Field>
      {err && <ErrorText>{err}</ErrorText>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Field platform="mobile" label="Role or job" style={{ flex: 1, minWidth: 0 }}><TextInput ground="page" size="lg" value={f.job} onChange={e => put({ job: e.target.value })} /></Field>
        <Field platform="mobile" label="First page" style={{ width: 96, flex: 'none' }}><TextInput ground="page" size="lg" inputMode="numeric" placeholder="3" value={f.page} onChange={e => put({ page: digits(e.target.value) })} /></Field>
      </div>
      <Field platform="mobile" label="Also known as (separate with commas)"><TextInput ground="page" size="lg" value={f.aka} placeholder="Ellie, The Cartographer" onChange={e => put({ aka: e.target.value })} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button style={{ flex: 1 }} onClick={save}>Save</Button>
        <Button variant="subtle" platform="mobile" onClick={onClose}>Cancel</Button>
      </div>
    </FormOverlay>
  )
}
