import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Err, go, useToast } from '../util.jsx'

const FILTERS = ['pending', 'approved', 'declined']

export default function Admin() {
  const [rows, setRows] = useState(null), [filter, setFilter] = useState('pending'), [err, setErr] = useState(''), [busy, setBusy] = useState('')
  const toast = useToast()
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('invite_requests').select('*').order('created_at', { ascending: false })
    error ? setErr('Could not load requests. ' + error.message) : (setErr(''), setRows(data))
  }, [])
  useEffect(() => { load() }, [load])

  async function setStatus(r, status) {
    const { error } = await supabase.from('invite_requests').update({ status }).eq('id', r.id)
    if (error) return setErr(error.message)
    setRows(xs => xs.map(x => x.id === r.id ? { ...x, status } : x))
  }
  async function approve(r) {
    setBusy(r.id); setErr('')
    const { data, error } = await supabase.functions.invoke('invite-user', { body: { email: r.email } })
    setBusy('')
    if (error || data?.error) return setErr('Could not send the invite to ' + r.email + '. ' + (data?.error || error.message))
    setRows(xs => xs.map(x => x.id === r.id ? { ...x, status: 'approved' } : x))
    toast(data?.alreadyRegistered ? r.email + ' already has an account' : 'Invite sent to ' + r.email)
  }
  async function decline(r) {
    const prev = r.status
    await setStatus(r, 'declined')
    toast('Declined ' + r.email, { undo: () => setStatus(r, prev), ms: 6000 })
  }

  const list = (rows || []).filter(r => r.status === filter)
  const count = s => (rows || []).filter(r => r.status === s).length
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <button className="btn sm ghost" onClick={() => go('/')}>← Your books</button>
      </div>
      <h1 className="serif" style={{ fontSize: 30, marginBottom: 14 }}>Invite requests</h1>
      <div className="row wrap" style={{ marginBottom: 16 }} role="group" aria-label="Filter requests">
        {FILTERS.map(f => <button key={f} className={'chip' + (filter === f ? ' on' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)} ({count(f)})</button>)}
      </div>
      <Err>{err}</Err>
      {!rows && !err && <p className="mute">Loading…</p>}
      {rows && list.length === 0 && <p className="mute">Nothing {filter} right now.</p>}
      {list.map(r => (
        <div className="list-item" key={r.id} style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{r.email}</div>
            {r.note && <div className="mute" style={{ fontSize: 14 }}>“{r.note}”</div>}
            <div className="mute" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
          </div>
          {r.status === 'pending' && <>
            <button className="btn sm primary" disabled={busy === r.id} onClick={() => approve(r)}>{busy === r.id ? 'Sending…' : 'Approve'}</button>
            <button className="btn sm" onClick={() => decline(r)}>Decline</button></>}
          {r.status === 'declined' && <><button className="btn sm" onClick={() => setStatus(r, 'pending')}>Back to pending</button></>}
          {r.status === 'approved' && <span className="pill">Invited</span>}
        </div>
      ))}
      <p className="mute" style={{ fontSize: 13, marginTop: 24 }}>Only admins can see this page. Approving calls a Supabase Edge Function that holds the service key, so it never reaches the browser.</p>
    </main>
  )
}
