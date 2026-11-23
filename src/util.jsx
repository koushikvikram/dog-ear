import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Toast } from './design-system/index.js'

/* ---------- hash routing (GitHub Pages has no server rewrites) ---------- */
export function useRoute() {
  const read = () => {
    const h = window.location.hash
    return h.startsWith('#/') ? h.slice(1) : '/'
  }
  const [path, setPath] = useState(read)
  useEffect(() => {
    const f = () => setPath(read())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return path
}
export const go = path => { window.location.hash = '#' + path }

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16) }))

// "Dr. Anselm Pike" → "Anselm", "Lord Calder Ashgrove" → "Calder": titles are skipped, as the design does.
export const firstName = c => (c.name || '').trim().replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Lord|Lady|Sir|Dame|Old|Captain|Capt\.?)\s+/i, '').split(/\s+/)[0]

const days = iso => Math.floor((Date.now() - new Date(iso)) / 864e5)
const span = d => d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} weeks ago` : `${Math.round(d / 30)} months ago`
export const ago = iso => (iso ? 'Last highlight ' + span(days(iso)) : 'No highlights yet')
export const opened = iso => (iso ? 'Opened ' + span(days(iso)) : 'Not opened yet')
export const when = iso => span(days(iso))

/* ---------- toasts: confirmations and Undo only (errors are inline, in red) ----------
   One toast at a time, as the design draws it. A newer toast replaces the current one; if the current
   one was holding a deferred commit (a delete waiting for its Undo window), that commit runs right away.
   Dismissing with × also commits. Pages set where the toast sits with useToastPlacement(). */
const ToastCtx = createContext({ notify: () => {}, setPlacement: () => {} })
export const useToast = () => useContext(ToastCtx).notify
export function useToastPlacement(placement) {
  const { setPlacement } = useContext(ToastCtx)
  useEffect(() => { setPlacement(placement); return () => setPlacement('fixed') }, [placement, setPlacement])
}

export function ToastProvider({ children }) {
  const [cur, setCur] = useState(null)
  const [placement, setPlacement] = useState('fixed')
  const live = useRef(null) // { id, timer, commit }

  const settle = useCallback((doCommit) => {
    const t = live.current
    if (!t) return
    clearTimeout(t.timer); live.current = null
    if (doCommit && t.commit) t.commit()
  }, [])

  // notify(message, { undo, commit, ms }): commit runs after ms (or on × / replacement) unless Undo is pressed.
  const notify = useCallback((message, opts = {}) => {
    settle(true)
    const id = uid(), ms = opts.ms ?? (opts.undo ? 6000 : 3000)
    const timer = setTimeout(() => { settle(true); setCur(c => (c && c.id === id ? null : c)) }, ms)
    live.current = { id, timer, commit: opts.commit }
    setCur({ id, message, undo: opts.undo })
  }, [settle])

  const dismiss = () => { settle(true); setCur(null) }
  const undo = () => { const u = cur.undo; settle(false); setCur(null); u() }

  return (
    <ToastCtx.Provider value={{ notify, setPlacement }}>
      {children}
      {cur && <Toast key={cur.id} placement={placement} message={cur.message} onAction={cur.undo ? undo : null} onDismiss={dismiss} />}
    </ToastCtx.Provider>
  )
}

/* ---------- voice dictation (Web Speech API) ---------- */
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export function useDictation(onText, onError) {
  const rec = useRef(null)
  const cb = useRef({ onText, onError }); cb.current = { onText, onError }
  const [listening, setListening] = useState(false)
  const stop = useCallback(() => { rec.current && rec.current.stop() }, [])
  const start = useCallback(() => {
    const err = m => cb.current.onError && cb.current.onError(m)
    if (!SR) return err('Dictation is not available in this browser. You can type instead.')
    const r = new SR()
    r.lang = navigator.language || 'en-US'; r.interimResults = false; r.continuous = false
    r.onresult = e => { const t = Array.from(e.results).map(x => x[0].transcript).join(' ').trim(); t && cb.current.onText(t) }
    r.onerror = e => {
      err(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it in your browser settings and try again.'
        : e.error === 'no-speech' ? 'Could not hear you. Try again or type.'
          : e.error === 'network' ? 'Dictation needs a connection. You can type instead.' : 'Dictation could not start. You can type instead.')
    }
    r.onend = () => { setListening(false); rec.current = null }
    rec.current = r; setListening(true)
    try { r.start() } catch { setListening(false); rec.current = null; err('Dictation could not start. You can type instead.') }
  }, [])
  useEffect(() => () => rec.current && rec.current.abort(), [])
  return { listening, toggle: () => (listening ? stop() : start()) }
}
export const joinText = (cur, add) => (cur && !/\s$/.test(cur) ? cur + ' ' : cur || '') + add
