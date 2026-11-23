import React, { createContext, useContext, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { AccountButton, ErrorText, Menu, MenuItem, Wordmark } from '../design-system/index.js'
import { go, useToast } from '../util.jsx'
import { useDismiss } from './overlays.jsx'

// Who is signed in, for the account menu. Set once in App.
export const SessionCtx = createContext({ email: '', isAdmin: false })
export const useSession = () => useContext(SessionCtx)

// The top row every screen opens with: the wordmark on the left, the screen's global control on the right.
export function TopRow({ children, admin }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-16)', flexWrap: 'wrap' }}>
      <a href="#/" aria-label="Dog-Ear, your books" style={{ color: 'var(--text)', borderRadius: 'var(--radius-sm)' }}><Wordmark admin={admin} /></a>
      {children}
    </div>
  )
}

export function AccountMenu({ platform }) {
  const { email, isAdmin } = useSession()
  const [open, setOpen] = useState(false), [err, setErr] = useState('')
  const ref = useRef()
  const toast = useToast()
  const m = platform === 'mobile'
  useDismiss(ref, open, () => setOpen(false))

  async function exportData() {
    setOpen(false); setErr('')
    const { data, error } = await supabase.rpc('export_my_data')
    if (error) return setErr('Could not export your data. Try again in a moment.')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'dog-ear-export-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click(); URL.revokeObjectURL(a.href)
    toast('Export downloaded')
  }
  async function signOut() { setOpen(false); await supabase.auth.signOut(); go('/') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <AccountButton initial={(email[0] || 'Y').toUpperCase()} email={m ? null : email} expanded={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <Menu header={m ? 'Signed in as ' + email : null}>
          <MenuItem onClick={exportData}>Export my data</MenuItem>
          {isAdmin && !m && <MenuItem onClick={() => { setOpen(false); go('/admin') }}>Invite requests</MenuItem>}
          <MenuItem onClick={signOut}>Sign out</MenuItem>
        </Menu>
      )}
      {err && <ErrorText style={{ position: 'absolute', right: 0, top: 50, width: 260, textAlign: 'right' }}>{err}</ErrorText>}
    </div>
  )
}
