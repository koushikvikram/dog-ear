import React, { useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  AppShell, AuthCard, Button, Container, ErrorText, Eyebrow, FeatureTile, Field, Honeypot, ScrollArea,
  SegmentedControl, SuccessDisc, TextArea, TextInput,
} from '../design-system/index.js'
import { usePlatform } from '../ui/usePlatform.js'
import { TopRow } from '../ui/chrome.jsx'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }
const desc = { fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }

export default function Landing() {
  const platform = usePlatform(), m = platform === 'mobile'
  const [mode, setMode] = useState('req')

  const features = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)', marginTop: m ? 'var(--space-8)' : 'var(--space-32)' }}>
      <FeatureTile icon="lexicon" color="var(--palette-blue)" title="Lexicon">Words you looked up, with a dictionary search.</FeatureTile>
      <FeatureTile icon="graph" color="var(--palette-green)" title="Character graph">Draw ties between characters on an endless canvas.</FeatureTile>
      <FeatureTile icon="highlight" color="var(--palette-yellow)" title="Highlights">Page, quote and thought, typed or dictated.</FeatureTile>
    </div>
  )
  const card = (
    <AuthCard platform={platform}>
      <SegmentedControl label="How do you want to start?" items={[
        { label: 'Request an invite', selected: mode === 'req', onClick: () => setMode('req') },
        { label: 'I have an invite', selected: mode === 'sign', onClick: () => setMode('sign') },
      ]} />
      {mode === 'req' ? <Request m={m} onSignIn={() => setMode('sign')} /> : <SignIn m={m} />}
    </AuthCard>
  )
  const hero = (
    <div style={{ flex: m ? '1 1 100%' : '1 1 440px', minWidth: 0 }}>
      <Eyebrow style={{ color: 'var(--accent)' }}>Invite only</Eyebrow>
      <h1 className={m ? 'mobile-display' : 'desktop-display'} style={{ margin: '12px 0 0' }}>Notes for the books you hold in your hands.</h1>
      <p className={m ? 'mobile-lede' : 'desktop-lede'} style={{ margin: '18px 0 0', color: 'var(--text-muted)', maxWidth: 520 }}>
        Keep a word list, map who is tied to whom, and capture highlights by page number or voice. Works on your phone while you read.
        Every book keeps its own notes, private to you.
      </p>
      {m ? null : features}
    </div>
  )
  const footer = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', justifyContent: 'space-between', paddingTop: 'var(--space-24)', borderTop: '1px solid var(--divider)', fontSize: 13, color: 'var(--text-muted)' }}>
      <div>Your notes are stored privately in your account. Nobody else can read them.</div>
      <div>Dog-Ear is a personal project.</div>
    </div>
  )
  const main = (
    <main style={{ display: 'flex', flexWrap: 'wrap', gap: m ? 'var(--space-24)' : 'var(--space-56)', alignItems: 'flex-start', padding: m ? '28px 0 24px' : '56px 0 40px' }}>
      {hero}{card}{m ? <div style={{ flex: '1 1 100%' }}>{features}</div> : null}
    </main>
  )
  if (m) return (
    <AppShell platform="mobile">
      <ScrollArea style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px calc(32px + env(safe-area-inset-bottom))' }}>
        <TopRow />{main}{footer}
      </ScrollArea>
    </AppShell>
  )
  return (
    <AppShell>
      <Container width="wide" style={{ padding: '32px 40px 56px' }}><TopRow />{main}{footer}</Container>
    </AppShell>
  )
}

function Request({ m, onSignIn }) {
  const [email, setEmail] = useState(''), [note, setNote] = useState('')
  const [err, setErr] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false)
  const form = useRef()

  async function submit(e) {
    e.preventDefault(); setErr('')
    const addr = email.trim()
    if (!EMAIL.test(addr)) return setErr('Enter a valid email address.')
    if (form.current.querySelector('.de-honeypot input')?.value) { setDone(true); return } // bots fill the hidden field; pretend it worked
    setBusy(true)
    // No .select(): visitors have no read access. A duplicate (23505) is treated as success
    // so the form never reveals who has already asked.
    const { error } = await supabase.from('invite_requests').insert({ email: addr, note: note.trim() || null })
    setBusy(false)
    if (error && error.code !== '23505') return setErr('Something went wrong. Try again in a moment.')
    setDone(true)
  }
  if (done) return (
    <div style={stack} role="status">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <SuccessDisc icon="check" /><div style={{ fontSize: 18, fontWeight: 700 }}>Request received</div>
      </div>
      <div style={desc}>Thanks. If you are invited, an email from Dog-Ear will arrive with a link to set up your account.</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>Already asked before? No need to send it again. Requests are answered in the order they arrive.</div>
      <Button variant="secondary" onClick={onSignIn}>I already have an invite</Button>
    </div>
  )
  return (
    <form ref={form} style={stack} onSubmit={submit} noValidate>
      <div style={desc}>Dog-Ear is shared with a small group. Leave your email and you will hear back if there is room.</div>
      <Field label="Email">
        <TextInput ground="page" size={m ? 'lg' : 'md'} invalid={!!err} type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={e => { setEmail(e.target.value); setErr('') }} />
      </Field>
      <Field label="What will you read with it? (optional)">
        <TextArea size={m ? 'lg' : 'md'} maxLength={500} placeholder="A few words are plenty" value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <Honeypot />
      {err && <ErrorText>{err}</ErrorText>}
      <Button type="submit" block disabled={busy}>{busy ? 'Sending…' : 'Request an invite'}</Button>
    </form>
  )
}

function SignIn({ m }) {
  const [email, setEmail] = useState(''), [err, setErr] = useState(''), [sent, setSent] = useState(false), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr('')
    const addr = email.trim()
    if (!EMAIL.test(addr)) return setErr('Enter a valid email address.')
    setBusy(true)
    // shouldCreateUser:false means an uninvited email never gets an account.
    // The same message shows either way, so the form never reveals who is invited.
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error && /rate|too many|seconds/i.test(error.message)) return setErr('Wait a minute before asking for another link.')
    setSent(true)
  }
  if (sent) return (
    <div style={stack} role="status">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <SuccessDisc icon="mail" /><div style={{ fontSize: 18, fontWeight: 700 }}>Check your email</div>
      </div>
      <div style={desc}>If {email.trim()} has been invited, a sign-in link is on its way. The link works once. Check your spam folder if it does not show up in a minute.</div>
      <Button variant="secondary" onClick={() => { setSent(false); setEmail('') }}>Use a different email</Button>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Open the link on this device. Did not arrive? You can ask for another link in a minute.</div>
    </div>
  )
  return (
    <form style={stack} onSubmit={submit} noValidate>
      <div style={desc}>Enter the email you were invited with. We will send you a one-time link. No password needed.</div>
      <Field label="Email">
        <TextInput ground="page" size={m ? 'lg' : 'md'} invalid={!!err} type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={e => { setEmail(e.target.value); setErr('') }} />
      </Field>
      {err && <ErrorText>{err}</ErrorText>}
      <Button type="submit" block disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</Button>
    </form>
  )
}
