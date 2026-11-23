import React, { useEffect, useState } from 'react'
import { supabase, configured } from './supabase.js'
import { ToastProvider, useRoute } from './util.jsx'
import { flush } from './offline.js'
import { AppShell, Container, EmptyState, ScrollArea } from './design-system/index.js'
import { SessionCtx, TopRow } from './ui/chrome.jsx'
import { usePlatform } from './ui/usePlatform.js'
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

  if (session === undefined) return <Message>Loading…</Message>

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

  return <SessionCtx.Provider value={{ email: session.user.email || '', isAdmin }}>{page}</SessionCtx.Provider>
}

// A plain full-screen page in the design-system frame: Loading, Admins only, Almost there.
function Message({ title, children }) {
  const m = usePlatform() === 'mobile'
  const body = (
    <>
      <TopRow />
      <div style={{ padding: m ? '28px 0 0' : '40px 0 0', maxWidth: 640 }}>
        {title && <h1 className={m ? 'mobile-title' : 'desktop-title'} style={{ margin: '0 0 6px' }}>{title}</h1>}
        <EmptyState style={{ margin: 0 }}>{children}</EmptyState>
      </div>
    </>
  )
  return m
    ? <AppShell platform="mobile"><ScrollArea style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 32px' }}>{body}</ScrollArea></AppShell>
    : <AppShell><Container style={{ padding: '32px 40px 56px' }}>{body}</Container></AppShell>
}

function NotAllowed() {
  return <Message title="Admins only">This page is for the person who runs this Dog-Ear. <a href="#/" style={{ color: 'var(--accent)' }}>Back to your books</a></Message>
}

function Setup() {
  return (
    <Message title="Almost there">
      This build has no Supabase project attached. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (in{' '}
      <code>.env.local</code> for local work, or as repository variables for GitHub Pages) and rebuild. The README walks through it.
    </Message>
  )
}
