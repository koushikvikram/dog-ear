import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

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

export const LABEL_COLORS = ['#ffe27a', '#9cc2ff', '#ffb3c1', '#a5e3b8', '#d9b8ff', '#ffc999', '#9be7e0', '#d6d6dc']
export const TIE_COLORS = ['#7DD3A8', '#8fb0ff', '#ffd166', '#ff9ecb', '#d9b8ff', '#ffc999', '#9be7e0', '#d6d6dc']
export const TIE_DASHES = ['', '6 4', '2 4', '10 4 2 4', '', '6 4', '2 4', '10 4 2 4']
export const labelColor = i => LABEL_COLORS[(i ?? 0) % LABEL_COLORS.length]
export const tieColor = i => TIE_COLORS[(i ?? 0) % TIE_COLORS.length]
export const tieDash = i => TIE_DASHES[(i ?? 0) % TIE_DASHES.length]
export const firstName = c => (c.name || '').split(' ')[0]
export const ago = iso => {
  if (!iso) return 'No highlights yet'
  const d = Math.floor((Date.now() - new Date(iso)) / 864e5)
  return d <= 0 ? 'Last highlight today' : d === 1 ? 'Last highlight yesterday' : `Last highlight ${d} days ago`
}

/* ---------- toasts: confirmations and Undo only (errors are inline, in red) ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef({})
  const dismiss = useCallback(id => {
    clearTimeout(timers.current[id]); delete timers.current[id]
    setItems(xs => xs.filter(x => x.id !== id))
  }, [])
  // notify(message, { undo, commit, ms }): commit runs after ms unless Undo is pressed.
  const notify = useCallback((message, opts = {}) => {
    const id = uid(), ms = opts.ms ?? (opts.undo ? 6000 : 3000)
    setItems(xs => [...xs.slice(-2), { id, message, undo: opts.undo }])
    timers.current[id] = setTimeout(() => { dismiss(id); opts.commit && opts.commit() }, ms)
    const onUndo = () => { dismiss(id); opts.undo() }
    setItems(xs => xs.map(x => x.id === id ? { ...x, onUndo } : x))
  }, [dismiss])
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div className="toast" key={t.id}>
            <span>{t.message}</span>
            {t.undo && <button type="button" onClick={t.onUndo}>Undo</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- dialog / bottom sheet ---------- */
export function Dialog({ title, onClose, children, footer, wide }) {
  const ref = useRef()
  useEffect(() => {
    const f = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    const first = ref.current?.querySelector('input,textarea,select')
    first && first.focus()
    return () => window.removeEventListener('keydown', f)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label={title} ref={ref} style={wide ? { maxWidth: 560 } : null}>
        <h2>{title}</h2>
        {children}
        {footer && <div className="foot">{footer}</div>}
      </div>
    </div>
  )
}

export const Err = ({ children }) => children ? <p className="err" role="alert">{children}</p> : null

export function Field({ label, children }) {
  return <label className="fld">{label}{children}</label>
}

/* ---------- voice dictation (Web Speech API) ---------- */
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const dictationSupported = Boolean(SR)

export function useDictation(onText, onError) {
  const rec = useRef(null)
  const [listening, setListening] = useState(false)
  const stop = useCallback(() => { rec.current && rec.current.stop() }, [])
  const start = useCallback(() => {
    if (!SR) return onError && onError('Voice dictation is not supported in this browser. Try Chrome, Edge or Safari.')
    const r = new SR()
    r.lang = navigator.language || 'en-US'; r.interimResults = false; r.continuous = false
    r.onresult = e => { const t = Array.from(e.results).map(x => x[0].transcript).join(' ').trim(); t && onText(t) }
    r.onerror = e => {
      const m = e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it in your browser settings and try again.'
        : e.error === 'no-speech' ? 'I did not catch anything. Try again.' : e.error === 'network' ? 'Dictation needs a connection.' : 'Dictation stopped.'
      onError && onError(m)
    }
    r.onend = () => { setListening(false); rec.current = null }
    rec.current = r; setListening(true); r.start()
  }, [onText, onError])
  useEffect(() => () => rec.current && rec.current.abort(), [])
  return { listening, toggle: () => (listening ? stop() : start()) }
}

export function Mic({ onText, onError, label = 'Dictate' }) {
  const { listening, toggle } = useDictation(onText, onError)
  return (
    <button type="button" className={'mic' + (listening ? ' on' : '')} onClick={toggle} aria-pressed={listening}
      aria-label={listening ? 'Stop dictation' : label} title={listening ? 'Listening… tap to stop' : label}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <rect x="7" y="2.5" width="6" height="10" rx="3" /><path d="M4 9.5a6 6 0 0 0 12 0M10 15.5V18" />
      </svg>
    </button>
  )
}
export const joinText = (cur, add) => (cur && !/\s$/.test(cur) ? cur + ' ' : cur || '') + add
