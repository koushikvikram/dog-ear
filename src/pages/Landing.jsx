import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { Err, Field } from '../util.jsx'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

export default function Landing() {
  const [tab, setTab] = useState('request')
  return (
    <div className="app">
      <header className="top"><span className="brand">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 4h12l6 6v18H7z" fill="#ECECEE" /><path d="M19 4v6h6z" fill="#7DD3A8" /></svg>
        Dog-Ear</span></header>
      <main className="hero">
        <section>
          <span className="pill">Invite only</span>
          <h1>Notes for the books you hold in your hands.</h1>
          <p className="mute" style={{ fontSize: 17 }}>A quiet place to keep the words you looked up, the people you need to keep straight, and the passages that made you stop.</p>
          <div className="feat"><span className="dot" style={{ background: '#ffe27a', marginTop: 7 }} /><div><b>Highlights</b><span className="mute">Page number, a thought, maybe a quote. Dictate it if your hands are full.</span></div></div>
          <div className="feat"><span className="dot" style={{ background: '#9cc2ff', marginTop: 7 }} /><div><b>Character graph</b><span className="mute">Who knows whom, and how. Your own kinds of ties, drawn on an endless canvas.</span></div></div>
          <div className="feat"><span className="dot" style={{ background: '#a5e3b8', marginTop: 7 }} /><div><b>Lexicon</b><span className="mute">The words worth keeping, with meanings one search away.</span></div></div>
        </section>
        <section className="card form">
          <div className="tabs2" role="tablist">
            <button role="tab" aria-selected={tab === 'request'} className={tab === 'request' ? 'on' : ''} onClick={() => setTab('request')}>Request an invite</button>
            <button role="tab" aria-selected={tab === 'signin'} className={tab === 'signin' ? 'on' : ''} onClick={() => setTab('signin')}>I have an invite</button>
          </div>
          {tab === 'request' ? <Request /> : <SignIn />}
        </section>
      </main>
    </div>
  )
}

function Request() {
  const [email, setEmail] = useState(''), [note, setNote] = useState(''), [hp, setHp] = useState('')
  const [err, setErr] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr('')
    const addr = email.trim()
    if (!EMAIL.test(addr)) return setErr('Enter a valid email address.')
    if (hp) { setDone(true); return } // bots fill the hidden field; pretend it worked
    setBusy(true)
    // No .select(): visitors have no read access. A duplicate (23505) is treated as success
    // so the form never reveals who has already asked.
    const { error } = await supabase.from('invite_requests').insert({ email: addr, note: note.trim() || null })
    setBusy(false)
    if (error && error.code !== '23505') return setErr('Something went wrong. Please try again in a moment.')
    setDone(true)
  }
  if (done) return <div role="status"><h2 style={{ fontSize: 18 }}>Thanks, you are on the list.</h2><p className="mute">If the request is approved, an invitation will arrive by email.</p></div>
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label="Your email"><input className="inp" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
      <Field label="Anything you would like me to know? (optional)"><textarea className="inp" rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></Field>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e => setHp(e.target.value)} name="website" />
      <Err>{err}</Err>
      <button className="btn primary wide" disabled={busy}>{busy ? 'Sending…' : 'Request an invite'}</button>
    </form>
  )
}

function SignIn() {
  const [email, setEmail] = useState(''), [err, setErr] = useState(''), [sent, setSent] = useState(false), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr('')
    const addr = email.trim()
    if (!EMAIL.test(addr)) return setErr('Enter a valid email address.')
    setBusy(true)
    // shouldCreateUser:false means an uninvited email never gets an account.
    // We show the same message either way so the form never reveals who is invited.
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error && /rate|too many|seconds/i.test(error.message)) return setErr('Please wait a minute before asking for another link.')
    setSent(true)
  }
  if (sent) return <div role="status"><h2 style={{ fontSize: 18 }}>Check your email</h2><p className="mute">If that address has an invite, a sign-in link is on its way. It works once and expires soon.</p></div>
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label="Email"><input className="inp" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
      <Err>{err}</Err>
      <button className="btn primary wide" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      <p className="mute" style={{ fontSize: 13, margin: 0 }}>No passwords. Open the link on this device.</p>
    </form>
  )
}
