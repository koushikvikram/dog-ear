import React, { useEffect, useRef, useState } from 'react'
import { supabase, configured } from './supabase.js'
import { ToastProvider, useRoute, go, useToast } from './util.jsx'
import { flush } from './offline.js'
import Landing from './pages/Landing.jsx'
import Library from './pages/Library.jsx'
import Admin from './pages/Admin.jsx'
import Book from './pages/Book.jsx'

const NEXT = 'dogear.next'

export default function App() {
  if (!configured) return <Setup />
  return <ToastProvider><Shell /></ToastProvider>
}

function Shell() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [isAdmin, setIsAdmin] = useState(false)
  const path = useRoute()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // After a magic link or invite lands, drop the code / token from the URL and go where the user was heading.
  useEffect(() => {
    if (!session) return
    const u = new URL(window.location.href)
    const stray = u.searchParams.has('code') || /access_token|error_description/.test(u.hash)
    if (stray) {
      const next = localStorage.getItem(NEXT) || '/'
      localStorage.removeItem(NEXT)
      window.history.replaceState(null, '', u.pathname + '#' + next)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    supabase.from('profiles').select('is_admin').maybeSingle().then(({ data }) => setIsAdmin(Boolean(data?.is_admin)))
    flush()
  }, [session])

  useEffect(() => { const f = () => flush(); window.addEventListener('online', f); return () => window.removeEventListener('online', f) }, [])

  if (session === undefined) return <div className="app" style={{ display: 'grid', placeItems: 'center' }}><p className="mute">Loading…</p></div>

  if (!session) {
    // remember a deep link so we can return to the book after sign-in
    if (path !== '/') localStorage.setItem(NEXT, path)
    return <Landing />
  }

  let page
  const m = path.match(/^\/book\/([0-9a-f-]{36})$/i)
  if (m) page = <Book key={m[1]} bookId={m[1]} />
  else if (path === '/admin') page = isAdmin ? <Admin /> : <NotAllowed />
  else page = <Library />

  return (
    <div className="app">
      <TopBar session={session} isAdmin={isAdmin} />
      {page}
    </div>
  )
}

function TopBar({ session, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef()
  const toast = useToast()
  useEffect(() => {
    const f = e => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f)
  }, [])

  async function exportData() {
    setOpen(false); setErr('')
    const { data, error } = await supabase.rpc('export_my_data')
    if (error) { setErr('Could not export your data. ' + error.message); return }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'dog-ear-export-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click(); URL.revokeObjectURL(a.href)
    toast('Export downloaded')
  }
  const email = session.user.email || ''
  return (
    <header className="top">
      <button className="brand" onClick={() => go('/')} aria-label="Dog-Ear, your books">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 4h12l6 6v18H7z" fill="#ECECEE" /><path d="M19 4v6h6z" fill="#7DD3A8" /></svg>
        Dog-Ear
      </button>
      <div className="grow" />
      {err && <span className="err" role="alert" style={{ margin: 0 }}>{err}</span>}
      <div className="rel" ref={ref}>
        <button className="btn sm ghost" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
          <span className="pill" style={{ background: '#16342A', color: '#7DD3A8' }}>{(email[0] || '?').toUpperCase()}</span>
          <span className="mute" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
        </button>
        {open && (
          <div className="menu" role="menu">
            <div className="who">{email}</div>
            <button role="menuitem" onClick={exportData}>Export my data</button>
            {isAdmin && <button role="menuitem" onClick={() => { setOpen(false); go('/admin') }}>Invite requests</button>}
            <button role="menuitem" onClick={async () => { setOpen(false); await supabase.auth.signOut(); go('/') }}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}

function NotAllowed() {
  return (
    <main className="page">
      <h1 className="serif">Admins only</h1>
      <p className="mute">This page is for the person who runs this Dog-Ear. <a href="#/">Back to your books</a></p>
    </main>
  )
}

function Setup() {
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <h1 className="serif">Almost there</h1>
      <p>This build has no Supabase project attached. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
        (in <code>.env.local</code> for local work, or as repository variables for GitHub Pages) and rebuild. The README walks through it.</p>
    </main>
  )
}
