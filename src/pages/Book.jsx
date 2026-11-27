import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  AppBody, AppHeader, AppShell, BottomTabBar, Button, Container, EmptyState, ErrorText, Eyebrow, Field, Icon, Panel,
  Select, SyncStatus, Tabs, TextInput,
} from '../design-system/index.js'
import { go, useToast, useToastPlacement } from '../util.jsx'
import { flush, queued } from '../offline.js'
import { usePlatform } from '../ui/usePlatform.js'
import { FormOverlay } from '../ui/overlays.jsx'
import { coverColor } from '../ui/palette.js'
import { useBookData } from './useBookData.js'
import Highlights from '../components/Highlights.jsx'
import Characters from '../components/Characters.jsx'
import Lexicon from '../components/Lexicon.jsx'

const SECTIONS = { hl: Highlights, chars: Characters, words: Lexicon }
const plural = (n, one, many = one + 's') => n + ' ' + (n === 1 ? one : many)

export default function Book({ bookId }) {
  const platform = usePlatform(), m = platform === 'mobile'
  const d = useBookData(bookId)
  const [tab, setTab] = useState('hl')
  const [focusHl, setFocusHl] = useState(null)   // a highlight chosen from a character, opened on the Highlights tab
  const openHighlight = id => { setFocusHl(id); setTab('hl') }
  const [switcher, setSwitcher] = useState(false)
  const [queuedN, setQueuedN] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const toast = useToast()
  useToastPlacement(m ? 'tabbar' : 'fixed')

  const refreshQueue = useCallback(() => queued().then(q => setQueuedN(q.length)), [])
  const resync = useCallback(async () => {
    const { sent, left } = await flush()
    setQueuedN(left)
    if (sent) { toast(plural(sent, 'change') + ' synced'); d.reload() }
  }, [])  // eslint-disable-line
  useEffect(() => {
    refreshQueue()
    const on = async () => { setOnline(true); await resync() }
    const off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [refreshQueue, resync])

  const offline = !online || queuedN > 0
  const sync = (
    <SyncStatus platform={platform} offline={offline} onClick={resync}
      aria-label={offline ? 'Offline, ' + plural(queuedN, 'change') + ' waiting. Press to try again' : 'All changes saved'}>
      {offline ? 'Offline · ' + queuedN + (m ? '' : ' waiting') : 'Saved'}
    </SyncStatus>
  )
  const Section = SECTIONS[tab]
  const ready = d.ready && !d.error
  const body = d.error
    ? <div style={{ padding: m ? '24px 16px' : '32px 0' }}><ErrorText>{d.error}</ErrorText><p><a href="#/" style={{ color: 'var(--accent)' }}>Back to your books</a></p></div>
    : !d.ready ? <EmptyState style={{ margin: m ? '24px 16px' : '32px 0' }}>Opening your notes…</EmptyState> : null

  if (m) return (
    <AppShell platform="mobile">
      <AppHeader title={d.book?.title || 'Book'} backHref="#/" backLabel="Back to Your books" trailing={ready ? sync : null} />
      <AppBody>{body || <Section key={bookId} d={d} platform="mobile" header={() => null} onQueued={refreshQueue}
        onOpenHighlight={openHighlight} focusId={focusHl} onFocused={() => setFocusHl(null)} />}</AppBody>
      <BottomTabBar items={[
        { label: 'Highlights', icon: 'highlight-tab', selected: tab === 'hl', onClick: () => setTab('hl') },
        { label: 'Characters', icon: 'graph', selected: tab === 'chars', onClick: () => setTab('chars') },
        { label: 'Lexicon', icon: 'lexicon', selected: tab === 'words', onClick: () => setTab('words') },
      ]} />
    </AppShell>
  )

  const subline = !ready ? '' : tab === 'words' ? plural(d.words.length, 'word')
    : tab === 'chars' ? plural(d.characters.length, 'character') + ', ' + plural(d.ties.length, 'tie') + ', ' + plural(d.tieTypes.length, 'tie type')
      : plural(d.highlights.length, 'highlight') + ' from your copy'
  const header = actions => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', padding: '28px 0 0' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="desktop-title" style={{ margin: 0, letterSpacing: '-0.02em' }}>{d.book.title}</h1>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {subline}{sync}
          </div>
        </div>
        {actions}
      </div>
      <Tabs style={{ marginTop: 18 }} items={[
        { label: 'Lexicon', count: d.words.length, selected: tab === 'words', onClick: () => setTab('words') },
        { label: 'Characters', count: d.characters.length, selected: tab === 'chars', onClick: () => setTab('chars') },
        { label: 'Highlights', count: d.highlights.length, selected: tab === 'hl', onClick: () => setTab('hl') },
      ]} />
    </>
  )
  return (
    <AppShell minHeight="900px">
      <Container style={{ padding: '36px 40px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Button variant="subtle" href="#/" aria-label="Back to Your books"><Icon name="back" size={16} />Your books</Button>
          {ready && (
            <Button variant="subtle" onClick={() => setSwitcher(true)} aria-label={'Switch book, current: ' + d.book.title}>
              <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.book.title}</span>
              <Icon name="chevron-down-wide" size={12} />
            </Button>
          )}
        </div>
        {body || <Section key={bookId} d={d} platform="desktop" header={header} onQueued={refreshQueue}
          onOpenHighlight={openHighlight} focusId={focusHl} onFocused={() => setFocusHl(null)} />}
      </Container>
      {switcher && <BookSwitcher current={bookId} onClose={() => setSwitcher(false)} />}
    </AppShell>
  )
}

// Desktop book switcher: every book, the current one marked, and a short New book form.
function BookSwitcher({ current, onClose }) {
  const [books, setBooks] = useState(null), [err, setErr] = useState('')
  const [title, setTitle] = useState(''), [copy, setCopy] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.rpc('library_books').then(({ data, error }) => error ? setErr('Could not load your books. Try again in a moment.') : setBooks(data),
      () => setErr('You are offline. Your other books will show here when you are back online.'))
  }, [])
  const open = id => { onClose(); if (id !== current) go('/book/' + id) }
  async function create(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return setErr('Give the book a title.')
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('create_book', { p_title: t, p_copy_from: copy || null, p_color: coverColor((books || []).length) })
      .then(r => r, () => ({ error: true }))
    setBusy(false)
    error ? setErr('Could not create the book. Try again in a moment.') : open(data)
  }
  return (
    <FormOverlay title="Your books" onClose={onClose} focus={false}>
      <div>
        {!books && !err && <EmptyState>Loading…</EmptyState>}
        {(books || []).map(b => {
          const on = b.id === current
          return (
            <button key={b.id} type="button" onClick={() => open(b.id)} aria-pressed={on}
              style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', minHeight: 64, padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
                background: on ? 'var(--surface-raised)' : 'transparent', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), marginBottom: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{b.title}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{plural(b.chars, 'character')}, {plural(b.ties, 'tie')}, {plural(b.hl, 'highlight')}</span>
            </button>
          )
        })}
      </div>
      <Panel>
        <form onSubmit={create} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>New book</Eyebrow>
          <Field label="Title"><TextInput value={title} maxLength={200} placeholder="Book title" onChange={e => { setTitle(e.target.value); setErr('') }} /></Field>
          {books && books.length > 0 && (
            <Field label="Tie types">
              <Select value={copy} onChange={e => setCopy(e.target.value)}>
                <option value="">Start with none</option>
                {books.map(b => <option key={b.id} value={b.id}>Copy from {b.title}</option>)}
              </Select>
            </Field>
          )}
          {err && <ErrorText>{err}</ErrorText>}
          <Button type="submit" disabled={busy}>Create book</Button>
        </form>
      </Panel>
    </FormOverlay>
  )
}
