import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, Err, Field, TIE_COLORS, firstName, tieColor, tieDash } from '../util.jsx'

const R = 26

export default function Characters({ d }) {
  const [sel, setSel] = useState(null), [selTie, setSelTie] = useState(null)
  const [linkFrom, setLinkFrom] = useState(null), [pendingTie, setPendingTie] = useState(null)
  const [charDlg, setCharDlg] = useState(null), [typesOpen, setTypesOpen] = useState(false)
  const [hidden, setHidden] = useState([]), [msg, setMsg] = useState('')
  const [tip, setTip] = useState(() => !localStorage.getItem('dogear.tipGraph'))

  const char = id => d.characters.find(c => c.id === id)
  const selC = sel && char(sel)
  const tie = selTie && d.ties.find(t => t.id === selTie)

  useEffect(() => { if (sel && !selC) setSel(null); if (selTie && !tie) setSelTie(null) }, [d.characters, d.ties])  // eslint-disable-line

  function nodeClick(id) {
    if (linkFrom) {
      if (id === linkFrom) return setLinkFrom(null)
      setPendingTie({ from: linkFrom, to: id }); setLinkFrom(null); return
    }
    setSel(id); setSelTie(null); setMsg('')
  }
  const visibleTies = d.ties.filter(t => !t.tie_type_id || !hidden.includes(t.tie_type_id))

  return (
    <>
      {tip && <div className="card row" style={{ marginBottom: 12, padding: '10px 14px' }} role="note">
        <span className="grow mute" style={{ fontSize: 14 }}>Tap a character to see its ties. Double-tap to edit. Use “Link to…” to draw a tie. Drag the background to pan; pinch or scroll to zoom.</span>
        <button className="icon" aria-label="Dismiss tip" onClick={() => { localStorage.setItem('dogear.tipGraph', '1'); setTip(false) }}>✕</button></div>}
      {linkFrom && <div className="card ok" role="status" style={{ marginBottom: 12 }}>Tap the character that {firstName(char(linkFrom))} is tied to. <button className="btn sm" onClick={() => setLinkFrom(null)}>Cancel</button></div>}

      <Graph d={d} ties={visibleTies} sel={sel} selTie={selTie} linking={Boolean(linkFrom)}
        onNode={nodeClick} onOpen={id => setCharDlg({ id })} onEdge={id => { setSelTie(id); setSel(null) }} onBg={() => { setSel(null); setSelTie(null) }}
        onTypes={() => setTypesOpen(true)} onAdd={() => setCharDlg({})} />

      <Err>{msg}</Err>
      {selC && (
        <section className="card gpanel" aria-label={selC.name}>
          <div className="row wrap">
            <div className="grow"><h3 className="serif" style={{ fontSize: 20 }}>{selC.name}</h3>
              <div className="mute" style={{ fontSize: 13 }}>{[selC.profession, selC.first_page && 'first seen p. ' + selC.first_page].filter(Boolean).join(' · ')}</div>
              {selC.aliases?.length > 0 && <div className="mute" style={{ fontSize: 13 }}>Also known as {selC.aliases.join(', ')}</div>}
              {selC.notes && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{selC.notes}</p>}</div>
            <button className="btn sm" onClick={() => setLinkFrom(selC.id)} disabled={d.characters.length < 2}>Link to…</button>
            <button className="btn sm" onClick={() => setCharDlg({ id: selC.id })}>Edit</button>
            <button className="btn sm danger" onClick={() => { d.removeCharacter(selC); setSel(null) }}>Remove</button>
          </div>
        </section>
      )}
      {tie && <TiePanel d={d} tie={tie} char={char} onClose={() => setSelTie(null)} />}

      {charDlg && <CharDialog d={d} id={charDlg.id} onClose={() => setCharDlg(null)} onSaved={id => { setCharDlg(null); id && setSel(id) }} />}
      {typesOpen && <TypesDialog d={d} hidden={hidden} setHidden={setHidden} onClose={() => setTypesOpen(false)} />}
      {pendingTie && <NewTie d={d} from={char(pendingTie.from)} to={char(pendingTie.to)} onClose={() => setPendingTie(null)} onSaved={id => { setPendingTie(null); setSelTie(id); setSel(null) }} />}
    </>
  )
}

/* ---------------- graph canvas ---------------- */
function Graph({ d, ties, sel, selTie, linking, onNode, onOpen, onEdge, onBg, onTypes, onAdd }) {
  const wrap = useRef(), svg = useRef()
  const [v, setV] = useState({ tx: 0, ty: 0, k: 1 })
  const vr = useRef(v); vr.current = v
  const g = useRef({ pointers: new Map(), mode: null, last: { id: null, t: 0 } })
  const chars = d.characters
  const fittedFor = useRef(0)

  const size = () => { const r = wrap.current.getBoundingClientRect(); return { w: r.width, h: r.height } }
  const toWorld = (cx, cy) => { const r = svg.current.getBoundingClientRect(); return { x: (cx - r.left - vr.current.tx) / vr.current.k, y: (cy - r.top - vr.current.ty) / vr.current.k } }

  function fit(over = {}) {
    if (!chars.length) return setV({ tx: 0, ty: 0, k: 1 })
    const { w, h } = size(), pad = 60
    const at = c => over[c.id] || c
    const xs = chars.map(c => at(c).x), ys = chars.map(c => at(c).y)
    const minX = Math.min(...xs) - R, maxX = Math.max(...xs) + R, minY = Math.min(...ys) - R, maxY = Math.max(...ys) + R + 20
    const k = Math.max(.3, Math.min(1.6, (w - pad) / Math.max(1, maxX - minX), (h - pad) / Math.max(1, maxY - minY)))
    setV({ k, tx: w / 2 - ((minX + maxX) / 2) * k, ty: h / 2 - ((minY + maxY) / 2) * k })
  }
  useEffect(() => { if (chars.length && fittedFor.current === 0) { fittedFor.current = 1; fit() } }, [chars.length])  // eslint-disable-line

  function zoom(f, cx, cy) {
    const { w, h } = size(); cx = cx ?? w / 2; cy = cy ?? h / 2
    setV(o => { const k = Math.max(.25, Math.min(3, o.k * f)); return { k, tx: cx - (cx - o.tx) * (k / o.k), ty: cy - (cy - o.ty) * (k / o.k) } })
  }
  useEffect(() => {
    const el = svg.current
    const f = e => { e.preventDefault(); const r = el.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top) }
    el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f)
  }, [])

  function autoArrange() {
    const n = chars.length, moves = {}
    if (!n) return
    const rings = n <= 8 ? [n] : [Math.ceil(n * .4), n - Math.ceil(n * .4)]
    let i = 0
    rings.forEach((cnt, ri) => { const rad = 110 + ri * 120
      for (let j = 0; j < cnt && i < n; j++, i++) { const a = (j / cnt) * Math.PI * 2 - Math.PI / 2 + ri * .3; moves[chars[i].id] = { x: Math.round(Math.cos(a) * rad), y: Math.round(Math.sin(a) * rad) } } })
    d.setPositions(moves); fit(moves)
  }

  /* pointer handling: pan, drag node, pinch, tap */
  function down(e) {
    const s = g.current; svg.current.setPointerCapture(e.pointerId)
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (s.pointers.size === 2) {
      const [a, b] = [...s.pointers.values()]
      s.mode = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), moved: true }; return
    }
    const node = e.target.closest('[data-node]'), edge = e.target.closest('[data-edge]')
    if (node) { const c = chars.find(c => c.id === node.dataset.node); s.mode = { type: 'node', id: c.id, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, moved: false } }
    else if (edge) s.mode = { type: 'edge', id: edge.dataset.edge, sx: e.clientX, sy: e.clientY, moved: false }
    else s.mode = { type: 'pan', sx: e.clientX, sy: e.clientY, tx: vr.current.tx, ty: vr.current.ty, moved: false }
  }
  function move(e) {
    const s = g.current, m = s.mode
    if (!s.pointers.has(e.pointerId)) return
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!m) return
    if (m.type === 'pinch' && s.pointers.size === 2) {
      const [a, b] = [...s.pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), r = svg.current.getBoundingClientRect()
      zoom(dist / m.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); m.dist = dist; return
    }
    const dx = e.clientX - m.sx, dy = e.clientY - m.sy
    if (!m.moved && Math.hypot(dx, dy) < 5) return
    m.moved = true
    if (m.type === 'pan') setV(o => ({ ...o, tx: m.tx + dx, ty: m.ty + dy }))
    if (m.type === 'node') d.setPositions({ [m.id]: { x: Math.round(m.ox + dx / vr.current.k), y: Math.round(m.oy + dy / vr.current.k) } })
  }
  function up(e) {
    const s = g.current, m = s.mode; s.pointers.delete(e.pointerId)
    if (s.pointers.size === 0) s.mode = null
    if (!m || m.moved) return
    if (m.type === 'node') {
      const now = Date.now()
      if (s.last.id === m.id && now - s.last.t < 380) { s.last = { id: null, t: 0 }; onOpen(m.id) }
      else { s.last = { id: m.id, t: now }; onNode(m.id) }
    } else if (m.type === 'edge') onEdge(m.id)
    else if (m.type === 'pan') onBg()
  }

  /* geometry */
  const byId = useMemo(() => Object.fromEntries(chars.map(c => [c.id, c])), [chars])
  const groups = {}
  ties.forEach(t => { const k = [t.from_character_id, t.to_character_id].sort().join('|'); (groups[k] = groups[k] || []).push(t) })
  const edges = ties.map(t => {
    const S = byId[t.from_character_id], T = byId[t.to_character_id]; if (!S || !T) return null
    const k = [t.from_character_id, t.to_character_id].sort().join('|'), grp = groups[k], i = grp.indexOf(t), n = grp.length
    const dx = T.x - S.x, dy = T.y - S.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len
    const flip = t.from_character_id < t.to_character_id ? 1 : -1
    const off = (i - (n - 1) / 2) * 44 * flip
    const C = { x: (S.x + T.x) / 2 - uy * off * 2, y: (S.y + T.y) / 2 + ux * off * 2 }
    const toward = (P, Q) => { const l = Math.hypot(Q.x - P.x, Q.y - P.y) || 1; return { x: (Q.x - P.x) / l, y: (Q.y - P.y) / l } }
    const d1 = toward(S, off ? C : T), d2 = toward(off ? C : S, T)
    const A = { x: S.x + d1.x * R, y: S.y + d1.y * R }, E = { x: T.x - d2.x * (R + 3), y: T.y - d2.y * (R + 3) }
    const ang = Math.atan2(d2.y, d2.x), hd = a => `${E.x - 11 * Math.cos(ang + a)},${E.y - 11 * Math.sin(ang + a)}`
    const type = d.tieTypes.find(x => x.id === t.tie_type_id)
    const mid = { x: .25 * A.x + .5 * C.x + .25 * E.x, y: .25 * A.y + .5 * C.y + .25 * E.y }
    return { id: t.id, path: `M ${A.x} ${A.y} ${off ? 'Q ' + C.x + ' ' + C.y : 'L'} ${E.x} ${E.y}`, head: `${E.x},${E.y} ${hd(.42)} ${hd(-.42)}`,
      color: type ? tieColor(type.color_index) : '#A1A1AA', dash: type ? tieDash(type.color_index) : '3 5', label: t.label || (type ? '' : ''), mid, from: t.from_character_id, to: t.to_character_id }
  }).filter(Boolean)
  const nb = new Set(); if (sel) { nb.add(sel); ties.forEach(t => { if (t.from_character_id === sel) nb.add(t.to_character_id); if (t.to_character_id === sel) nb.add(t.from_character_id) }) }

  return (
    <div className="gwrap" ref={wrap}>
      <svg ref={svg} role="img" aria-label="Character graph" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <g transform={`translate(${v.tx} ${v.ty}) scale(${v.k})`}>
          {edges.map(e => {
            const hot = selTie === e.id || (sel && (e.from === sel || e.to === sel)), dim = sel && !hot
            return <g key={e.id} data-edge={e.id} style={{ cursor: 'pointer', opacity: dim ? .15 : 1 }}>
              <path d={e.path} stroke="transparent" strokeWidth="18" fill="none" />
              <path d={e.path} stroke={e.color} strokeWidth={hot ? 3 : 1.8} strokeDasharray={e.dash} fill="none" strokeLinecap="round" />
              <polygon points={e.head} fill={e.color} />
              {e.label && <text x={e.mid.x} y={e.mid.y - 5} textAnchor="middle" fontSize="11" fill="#C4C4CC" style={{ paintOrder: 'stroke', stroke: '#18181B', strokeWidth: 3 }}>{e.label}</text>}
            </g>
          })}
          {chars.map(c => {
            const on = sel === c.id, dim = sel && !nb.has(c.id)
            return <g key={c.id} className="node" data-node={c.id} transform={`translate(${c.x} ${c.y})`} style={{ cursor: linking ? 'crosshair' : 'pointer', opacity: dim ? .35 : 1 }}>
              <circle r={R} fill={on ? '#16342A' : '#26262B'} stroke={on ? '#7DD3A8' : '#3A3A41'} strokeWidth={on ? 3 : 1.5} />
              <text textAnchor="middle" dy="5" style={{ pointerEvents: "none" }} fontSize="15" fontWeight="700" fill="#ECECEE">{(c.name[0] || '?').toUpperCase()}</text>
              <text textAnchor="middle" y={R + 16} fontSize="12" fill="#C4C4CC">{firstName(c)}</text>
            </g>
          })}
        </g>
      </svg>
      {chars.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}><p className="mute">Add your first character to start the graph.</p></div>}
      <div className="gctl">
        <button className="small" onClick={onTypes} aria-label="Tie types">Ties</button>
        <button onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">−</button>
        <button className="small" onClick={() => fit()} aria-label="Fit all">Fit</button>
        <button className="small" onClick={autoArrange} aria-label="Auto-arrange">Auto</button>
      </div>
      <button className="btn primary gfab" onClick={onAdd}>+ Character</button>
    </div>
  )
}

/* ---------------- dialogs & panels ---------------- */
function TiePanel({ d, tie, char, onClose }) {
  const [label, setLabel] = useState(tie.label || '')
  useEffect(() => setLabel(tie.label || ''), [tie.id])  // eslint-disable-line
  const a = char(tie.from_character_id), b = char(tie.to_character_id)
  return (
    <section className="card gpanel" aria-label="Edit tie">
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <div className="grow" style={{ fontWeight: 600, minWidth: 160 }}>{a?.name} → {b?.name}</div>
        <Field label="Type"><select className="inp" value={tie.tie_type_id || ''} onChange={e => d.updateTie(tie.id, { tie_type_id: e.target.value || null })}>
          <option value="">Untyped</option>{d.tieTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Label"><input className="inp" value={label} maxLength={80} onChange={e => setLabel(e.target.value)} onBlur={() => label !== (tie.label || '') && d.updateTie(tie.id, { label })} /></Field>
        <button className="btn sm" onClick={() => d.updateTie(tie.id, { from_character_id: tie.to_character_id, to_character_id: tie.from_character_id })}>Swap</button>
        <button className="btn sm danger" onClick={() => { d.removeTie(tie); onClose() }}>Remove</button>
      </div>
    </section>
  )
}

function NewTie({ d, from, to, onClose, onSaved }) {
  const [type, setType] = useState(d.tieTypes[0]?.id || ''), [label, setLabel] = useState(''), [err, setErr] = useState('')
  async function save() { const r = await d.addTie(from.id, to.id, type, label.trim()); r.err ? setErr(r.err) : onSaved(r.id) }
  return (
    <Dialog title={`${from.name} → ${to.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Draw tie</button></>}>
      <div className="stack">
        <Field label="Tie type"><select className="inp" value={type} onChange={e => setType(e.target.value)}><option value="">Untyped</option>{d.tieTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Label (optional)"><input className="inp" value={label} maxLength={80} onChange={e => setLabel(e.target.value)} placeholder="e.g. since the war" /></Field>
        <Err>{err}</Err>
      </div>
    </Dialog>
  )
}

function CharDialog({ d, id, onClose, onSaved }) {
  const c = id ? d.characters.find(x => x.id === id) : null
  const [name, setName] = useState(c?.name || ''), [job, setJob] = useState(c?.profession || ''), [page, setPage] = useState(c?.first_page ? String(c.first_page) : '')
  const [aka, setAka] = useState((c?.aliases || []).join(', ')), [notes, setNotes] = useState(c?.notes || ''), [err, setErr] = useState('')
  async function save(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Give the character a name.')
    if (d.characters.some(x => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) return setErr('You already have a character called ' + n + '.')
    const body = { name: n, profession: job.trim() || null, first_page: page ? Number(page) : null, aliases: aka.split(',').map(s => s.trim()).filter(Boolean), notes: notes.trim() || null }
    if (c) { const e2 = await d.updateCharacter(id, body); e2 ? setErr(e2) : onSaved(id) }
    else { const r = await d.addCharacter(body); r.err ? setErr(r.err) : onSaved(r.id) }
  }
  return (
    <Dialog title={c ? 'Edit character' : 'Add character'} onClose={onClose}>
      <form className="stack" onSubmit={save} noValidate>
        <Field label="Name"><input className="inp" value={name} maxLength={120} onChange={e => { setName(e.target.value); setErr('') }} /></Field>
        <div className="row"><Field label="Role or job"><input className="inp" value={job} onChange={e => setJob(e.target.value)} /></Field>
          <div style={{ width: 110, flex: 'none' }}><Field label="First page"><input className="inp" inputMode="numeric" value={page} onChange={e => setPage(e.target.value.replace(/\D/g, ''))} /></Field></div></div>
        <Field label="Also known as (comma separated)"><input className="inp" value={aka} onChange={e => setAka(e.target.value)} /></Field>
        <Field label="Notes"><textarea className="inp" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        <Err>{err}</Err>
        <div className="foot" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">{c ? 'Save' : 'Add'}</button></div>
      </form>
    </Dialog>
  )
}

function TypesDialog({ d, hidden, setHidden, onClose }) {
  const [name, setName] = useState(''), [err, setErr] = useState('')
  async function add(e) {
    e.preventDefault(); const n = name.trim()
    if (!n) return setErr('Name the tie type.')
    if (d.tieTypes.some(t => t.name.toLowerCase() === n.toLowerCase())) return setErr('That tie type already exists.')
    const e2 = await d.addTieType(n); e2 ? setErr(e2) : (setName(''), setErr(''))
  }
  const count = id => d.ties.filter(t => t.tie_type_id === id).length
  return (
    <Dialog title="Tie types" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      {d.tieTypes.length === 0 && <p className="mute" style={{ marginTop: 0 }}>No tie types yet. Add kinds like Family, Friend, Rival.</p>}
      {d.tieTypes.map(t => {
        const off = hidden.includes(t.id)
        return <div className="list-item" key={t.id}>
          <button className="icon" aria-label={(off ? 'Show ' : 'Hide ') + t.name} aria-pressed={!off} onClick={() => setHidden(h => off ? h.filter(x => x !== t.id) : [...h, t.id])}>{off ? '◌' : '◉'}</button>
          <button className="dot" aria-label={'Change colour of ' + t.name} style={{ background: tieColor(t.color_index), width: 22, height: 22, border: 0 }}
            onClick={() => d.updateTieType(t.id, { color_index: (t.color_index + 1) % TIE_COLORS.length })} />
          <input className="inp grow" aria-label={'Rename ' + t.name} defaultValue={t.name} maxLength={60}
            onBlur={e => { const v = e.target.value.trim(); if (!v) e.target.value = t.name; else if (v !== t.name) d.updateTieType(t.id, { name: v }).then(x => x && (setErr(x), (e.target.value = t.name))) }} />
          <span className="mute" style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{count(t.id)}</span>
          <button className="icon" aria-label={'Delete ' + t.name} onClick={() => d.removeTieType(t)}>🗑</button>
        </div>
      })}
      <form className="row" onSubmit={add} style={{ marginTop: 10 }}>
        <input className="inp grow" placeholder="New tie type" value={name} maxLength={60} onChange={e => { setName(e.target.value); setErr('') }} />
        <button className="btn">Add</button>
      </form>
      <Err>{err}</Err>
    </Dialog>
  )
}
