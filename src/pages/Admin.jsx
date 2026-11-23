import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { AppShell, Button, Chip, Container, EmptyState, ErrorText, Icon, RequestRow, ScrollArea } from '../design-system/index.js'
import { useToast, useToastPlacement, when } from '../util.jsx'
import { usePlatform } from '../ui/usePlatform.js'
import { TopRow } from '../ui/chrome.jsx'

const FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['declined', 'Declined']]
const LOOK = Object.fromEntries(FILTERS)

// Invite requests: desktop only in the design; on a phone the same page scrolls in one column.
export default function Admin() {
  const m = usePlatform() === 'mobile'
  const [rows, setRows] = useState(null), [filter, setFilter] = useState('pending'), [err, setErr] = useState(''), [busy, setBusy] = useState('')
  const toast = useToast()
  useToastPlacement(m ? 'mobile' : 'fixed')
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('invite_requests').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ error: true }))
    error ? setErr('Could not load requests. Check your connection and reload.') : (setErr(''), setRows(data))
  }, [])
  useEffect(() => { load() }, [load])

  async function setStatus(r, status) {
    const { error } = await supabase.from('invite_requests').update({ status }).eq('id', r.id).then(x => x, () => ({ error: true }))
    if (error) { setErr('Could not update ' + r.email + '. Try again in a moment.'); return false }
    setRows(xs => xs.map(x => x.id === r.id ? { ...x, status } : x))
    return true
  }
  async function approve(r) {
    setBusy(r.id); setErr('')
    const { data, error } = await supabase.functions.invoke('invite-user', { body: { email: r.email } }).then(x => x, () => ({ error: true }))
    setBusy('')
    if (error || data?.error) return setErr('Could not send the invite to ' + r.email + '. Check the invite-user function logs.')
    setRows(xs => xs.map(x => x.id === r.id ? { ...x, status: 'approved' } : x))
    toast(data?.alreadyRegistered ? r.email + ' already has an account' : 'Invite emailed to ' + r.email)
  }
  async function decline(r) {
    const prev = r.status
    if (await setStatus(r, 'declined')) toast(r.email + ' declined', { undo: () => setStatus(r, prev), ms: 6000 })
  }
  async function reopen(r) { if (await setStatus(r, 'pending')) toast(r.email + ' moved back to pending') }

  const list = (rows || []).filter(r => r.status === filter)
  const count = s => (rows || []).filter(r => r.status === s).length
  const body = (
    <>
      <TopRow admin>
        <Button variant="secondary" compact href="#/" style={{ gap: 8 }}><Icon name="back" size={16} />Your books</Button>
      </TopRow>
      <div style={{ padding: m ? '28px 0 20px' : '40px 0 20px' }}>
        <h1 className={m ? 'mobile-title' : 'desktop-title'} style={{ margin: 0, letterSpacing: '-0.02em' }}>Invite requests</h1>
        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', maxWidth: 620 }}>
          Approving sends the person an email with a sign-in link and lets them create their account. Declining sends nothing.
        </div>
      </div>
      <div role="group" aria-label="Filter requests" style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', marginBottom: 'var(--space-20)' }}>
        {FILTERS.map(([id, label]) => <Chip key={id} size={m ? 'touch' : 'lg'} selected={filter === id} count={rows ? count(id) : undefined} onClick={() => setFilter(id)}>{label}</Chip>)}
      </div>
      {err && <ErrorText style={{ marginBottom: 12 }}>{err}</ErrorText>}
      {!rows && !err && <EmptyState>Loading requests{'…'}</EmptyState>}
      {rows && list.length === 0 && <EmptyState style={{ margin: '32px 0' }}>{filter === 'pending' ? 'No requests waiting. New requests will appear here.' : 'Nothing here yet.'}</EmptyState>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        {list.map(r => (
          <RequestRow key={r.id} email={r.email} status={r.status} statusLabel={LOOK[r.status]} note={r.note || 'No note left.'} when={when(r.created_at)}
            actions={r.status === 'pending'
              ? <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                <Button onClick={() => approve(r)} disabled={busy === r.id} aria-label={'Approve ' + r.email}>{busy === r.id ? 'Sending…' : 'Approve'}</Button>
                <Button variant="secondary" compact onClick={() => decline(r)} aria-label={'Decline ' + r.email}>Decline</Button>
              </div>
              : <Button variant="secondary" compact onClick={() => reopen(r)} aria-label={'Move ' + r.email + ' back to pending'}>Back to pending</Button>} />
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-32)', paddingTop: 'var(--space-20)', borderTop: '1px solid var(--divider)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', maxWidth: 660 }}>
        Only accounts marked as admin can see this page. Approving runs a server function that holds the private invite key, so the key never reaches the browser.
      </div>
    </>
  )
  return m
    ? <AppShell platform="mobile"><ScrollArea>{body}</ScrollArea></AppShell>
    : <AppShell><Container width="narrow" style={{ padding: '32px 40px 64px' }}>{body}</Container></AppShell>
}
