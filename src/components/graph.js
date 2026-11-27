// Character-graph geometry, ported from the design-system demo. Pure functions over world coordinates.
// A character's stored x,y is the centre of its node on both platforms.
import { TIE_UNTYPED, tieColor, tieDash } from '../ui/palette.js'

// Half size of a node for clipping ties: desktop node (≈152 × 60), phone pill (112 × 44, plus a little air).
export const DESK = { hw: 76, hh: 30 }
export const PHONE = { hw: 62, hh: 28, w: 112, h: 44 }

// Where the segment from A toward T leaves A's box.
export function clip(A, T, box = DESK) {
  const dx = T.x - A.x, dy = T.y - A.y
  const t = Math.min(Math.abs(dx) > 1e-6 ? box.hw / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? box.hh / Math.abs(dy) : 1e9)
  return { x: A.x + dx * t, y: A.y + dy * t }
}

const headPath = (T, base, nx, ny, w) => `M ${T.x} ${T.y} L ${base.x + nx * w} ${base.y + ny * w} L ${base.x - nx * w} ${base.y - ny * w} Z`

// A straight arrow S → E with a 14px head (the tie being drawn from a handle).
export function arrow(S, E) {
  let ux = E.x - S.x, uy = E.y - S.y
  const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l
  const base = { x: E.x - ux * 14, y: E.y - uy * 14 }
  return { line: `M ${S.x} ${S.y} L ${base.x} ${base.y}`, head: headPath(E, base, -uy, ux, 7) }
}

export const typeStyle = (typesById, id) => {
  const t = id && typesById[id]
  return t ? { color: tieColor(t.color_index), dash: tieDash(t.color_index), name: t.name } : { ...TIE_UNTYPED, name: 'Untyped' }
}

// Desktop ties: quadratic curves, bowed apart when two characters share several ties, with a 14px head.
export function deskEdges(byId, ties, typesById, sel, selTie, first) {
  const groups = {}
  ties.forEach(e => { if (byId[e.from_character_id] && byId[e.to_character_id]) { const k = [e.from_character_id, e.to_character_id].sort().join('|'); (groups[k] = groups[k] || []).push(e.id) } })
  return ties.filter(e => byId[e.from_character_id] && byId[e.to_character_id]).map(e => {
    const a = e.from_character_id, b = e.to_character_id
    const srt = [a, b].sort(), list = groups[srt.join('|')], i = list.indexOf(e.id), n = list.length
    const A = byId[a], B = byId[b], lo = byId[srt[0]], hi = byId[srt[1]], t = typeStyle(typesById, e.tie_type_id)
    const dx = hi.x - lo.x, dy = hi.y - lo.y, len = Math.hypot(dx, dy) || 1, o = n > 1 ? 36 * (i - (n - 1) / 2) : 16
    const C = { x: (A.x + B.x) / 2 + -dy / len * o * 2, y: (A.y + B.y) / 2 + dx / len * o * 2 }
    // a head where the curve meets P (the end's box edge): its tip, the base it is drawn from, and the outline
    const end = P => {
      let ux = P.x - C.x, uy = P.y - C.y
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul
      const T = { x: P.x - ux * 4, y: P.y - uy * 4 }, base = { x: T.x - ux * 14, y: T.y - uy * 14 }
      return { base, path: headPath(T, base, -uy, ux, 7) }
    }
    const S0 = clip(A, C), hb = end(clip(B, C)), ha = e.both_ways ? end(S0) : null
    const S = ha ? ha.base : S0, base = hb.base
    const mx = 0.25 * S.x + 0.5 * C.x + 0.25 * base.x, my = 0.25 * S.y + 0.5 * C.y + 0.25 * base.y
    const on = !!sel && (a === sel || b === sel), picked = selTie === e.id
    return {
      id: e.id, tie: e, both: !!e.both_ways, d: `M ${S.x} ${S.y} Q ${C.x} ${C.y} ${base.x} ${base.y}`, head: hb.path + (ha ? ' ' + ha.path : ''),
      mx, my, color: t.color, dash: t.dash, w: on || picked ? 3.5 : 2.5,
      op: selTie ? (picked ? 1 : 0.4) : !sel || on ? 1 : 0.14,
      label: e.label || 'untitled tie', fromName: first(A), toName: first(B),
    }
  })
}

// Phone ties: straight 2px lines from pill edge to pill edge, an 11px head (one at each end when both ways), the label above the middle.
export function phoneEdge(a, b, both = false) {
  const dx = b.x - a.x, dy = b.y - a.y
  const sc = Math.min(PHONE.hw / Math.max(Math.abs(dx), 1e-6), PHONE.hh / Math.max(Math.abs(dy), 1e-6))
  const x1 = a.x + dx * sc, y1 = a.y + dy * sc, x2 = b.x - dx * sc, y2 = b.y - dy * sc
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux
  const tri = (x, y, dx, dy) => [x, y, x - dx * 11 + px * 5, y - dy * 11 + py * 5, x - dx * 11 - px * 5, y - dy * 11 - py * 5].map(n => n.toFixed(1)).join(' ')
  const head = tri(x2, y2, ux, uy), tail = both ? tri(x1, y1, -ux, -uy) : null
  return { x1: both ? x1 + ux * 9 : x1, y1: both ? y1 + uy * 9 : y1, x2: x2 - ux * 9, y2: y2 - uy * 9, head, tail, lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 - 6 }
}

// A view that shows every character: pads by half a node plus air on each side.
export function fitView(chars, W, H, { padX, padY, min, max }) {
  if (!chars.length || !W || !H) return { tx: W / 2 || 0, ty: H / 2 || 0, k: 1 }
  const x0 = Math.min(...chars.map(c => c.x)) - padX, x1 = Math.max(...chars.map(c => c.x)) + padX
  const y0 = Math.min(...chars.map(c => c.y)) - padY, y1 = Math.max(...chars.map(c => c.y)) + padY
  const k = Math.min(max, Math.max(min, Math.min(W / (x1 - x0), H / (y1 - y0))))
  return { k, tx: W / 2 - (x0 + x1) / 2 * k, ty: H / 2 - (y0 + y1) / 2 * k }
}

// Force-directed layout (repel all, pull tied pairs), then push overlapping boxes apart. Returns { id: {x, y} }.
export function autoArrange(chars, ties, { cw = 240, ch = 96, ideal = 300 } = {}) {
  const n = chars.length
  if (!n) return {}
  const idx = {}; chars.forEach((c, i) => { idx[c.id] = i })
  const pr = {}
  ties.forEach(e => {
    const a = e.from_character_id, b = e.to_character_id
    if (idx[a] === undefined || idx[b] === undefined || a === b) return
    const key = [a, b].sort().join('|'); pr[key] = (pr[key] || 0) + 1
  })
  const links = Object.keys(pr).map(k => { const p = k.split('|'); return [idx[p[0]], idx[p[1]], pr[k]] })
  const X = [], Y = [], R = 160 + n * 40
  chars.forEach((c, i) => { const a = i / n * Math.PI * 2; X[i] = Math.cos(a) * R; Y[i] = Math.sin(a) * R * 0.7 })
  for (let it = 0; it < 500; it++) {
    const cool = 1 - it / 500, FX = new Array(n).fill(0), FY = new Array(n).fill(0)
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = X[i] - X[j], dy = Y[i] - Y[j], d = Math.hypot(dx, dy)
      if (d < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy) }
      const f = 9e4 / (d * d), ux = dx / d, uy = dy / d
      FX[i] += ux * f; FY[i] += uy * f; FX[j] -= ux * f; FY[j] -= uy * f
    }
    links.forEach(([a, c2, w]) => {
      const dx = X[c2] - X[a], dy = Y[c2] - Y[a], d = Math.hypot(dx, dy) || 1, f = 0.06 * (d - (ideal - 20 * Math.min(w - 1, 3))), ux = dx / d, uy = dy / d
      FX[a] += ux * f; FY[a] += uy * f; FX[c2] -= ux * f; FY[c2] -= uy * f
    })
    for (let i = 0; i < n; i++) {
      FX[i] -= X[i] * 0.012; FY[i] -= Y[i] * 0.012
      const m = Math.hypot(FX[i], FY[i]), cap = 40 * cool + 2, sc = m > cap ? cap / m : 1
      X[i] += FX[i] * sc; Y[i] += FY[i] * sc
    }
  }
  for (let pass = 0; pass < 80; pass++) {
    let moved = false
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const ox = cw - Math.abs(X[i] - X[j]), oy = ch - Math.abs(Y[i] - Y[j])
      if (ox > 0 && oy > 0) {
        moved = true
        if (ox < oy) { const m = (X[i] >= X[j] ? 1 : -1) * ox / 2; X[i] += m; X[j] -= m }
        else { const m = (Y[i] >= Y[j] ? 1 : -1) * oy / 2; Y[i] += m; Y[j] -= m }
      }
    }
    if (!moved) break
  }
  const out = {}
  chars.forEach((c, i) => { out[c.id] = { x: Math.round(X[i] + 500), y: Math.round(Y[i] + 320) } })
  return out
}
