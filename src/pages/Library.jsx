import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import {
  AddBookCard, AppShell, BookCard, Button, Chip, Container, EmptyState, ErrorText, Eyebrow, Field, ScrollArea,
  SearchField, Select, TextInput,
} from '../design-system/index.js'
import { ago, go, opened, useToast, useToastPlacement } from '../util.jsx'
import { usePlatform } from '../ui/usePlatform.js'
import { AccountMenu, TopRow } from '../ui/chrome.jsx'
import { ConfirmDialog, FormOverlay } from '../ui/overlays.jsx'
import { STATUS_COLORS, coverColor } from '../ui/palette.js'

const STATUSES = ['Reading', 'Finished', 'Paused']

export default function Library() {
  const platform = usePlatform(), m = platform === 'mobile'
  const [books, setBooks] = useState(null)
  const [hidden, setHidden] = useState([])       // ids soft-deleted this session (shown hidden until purge)
  const [q, setQ] = useState(''), [status, setStatus] = useState('all'), [sort, setSort] = useState('recent')
  const [form, setForm] = useState(null)         // {} new | { book } edit
  const [del, setDel] = useState(null)
  const [err, setErr] = useState('')
  const toast = useToast()
  useToastPlacement(m ? 'mobile' : 'fixed')

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('library_books')
    if (error) setErr('Could not load your books. Check your connection and reload.'); else { setErr(''); setBooks(data) }
  }, [])
  useEffect(() => { load() }, [load])

  async function remove(b) {
    setDel(null)
    setHidden(h => h.concat(b.id))
    const { error } = await supabase.from('books').update({ deleted_at: new Date().toISOString() }).eq('id', b.id)
    if (error) { setHidden(h => h.filter(x => x !== b.id)); return setErr('Could not delete ' + b.title + '. Try again in a moment.') }
    toast(b.title + ' deleted', {
      undo: async () => {
        await supabase.from('books').update({ deleted_at: null }).eq('id', b.id)
        setHidden(h => h.filter(x => x !== b.id))
      },
      ms: 8000,
    })
  }

  const all = (books || []).filter(b => !hidden.includes(b.id))
  const ql = q.trim().toLowerCase()
  const shown = all
    .filter(b => (status === 'all' || b.status === status) && (!ql || b.title.toLowerCase().includes(ql) || (b.author || '').toLowerCase().includes(ql)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : new Date(b.last_opened_at) - new Date(a.last_opened_at))
  const empty = books && all.length === 0
  const chip = (id, label, cur, set) => <Chip key={id} size={m ? 'touch' : 'md'} selected={cur === id} onClick={() => set(id)}>{label}</Chip>

  const body = (
    <>
      <TopRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-14)', fontSize: 14, color: 'var(--text-muted)' }}>
          {books && <span>{all.length} {all.length === 1 ? 'book' : 'books'}</span>}
          <AccountMenu platform={platform} />
        </div>
      </TopRow>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-16)', flexWrap: 'wrap', padding: '40px 0 24px' }}>
        <div>
          <h1 className={m ? 'mobile-title' : 'desktop-title'} style={{ margin: 0, letterSpacing: '-0.02em' }}>Your books</h1>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>Physical copies you are reading. Each book keeps its own words, characters, ties and highlights.</div>
        </div>
        <Button icon="plus" onClick={() => setForm({})}>New book</Button>
      </div>
      {!empty && books && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
          <SearchField size={m ? 'touch' : 'md'} placeholder="Search your books" value={q} onChange={e => setQ(e.target.value)} style={{ flex: '1 1 280px', maxWidth: m ? 'none' : 360 }} />
          <div role="group" aria-label="Filter by status" className={m ? 'app-chips-scroll' : 'app-wrap'} style={m ? { width: '100%' } : null}>
            {[['all', 'All'], ...STATUSES.map(s => [s, s])].map(([id, l]) => chip(id, l, status, setStatus))}
          </div>
          <div role="group" aria-label="Sort" className={m ? 'app-chips-scroll' : 'app-wrap'} style={m ? { width: '100%' } : { marginLeft: 'auto' }}>
            {chip('recent', 'Recently opened', sort, setSort)}{chip('title', 'A to Z', sort, setSort)}
          </div>
        </div>
      )}
      {err && <ErrorText style={{ marginBottom: 16 }}>{err}</ErrorText>}
      {!books && !err && <EmptyState>Loading your books…</EmptyState>}
      {books && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16)' }}>
          {shown.map((b, i) => (
            <BookCard key={b.id} title={b.title} author={b.author} color={b.color || coverColor(i)} status={b.status}
              statusColor={STATUS_COLORS[b.status]} opened={opened(b.last_opened_at)} lastHighlight={ago(b.last_highlight_at)}
              counts={{ chars: b.chars, ties: b.ties, hl: b.hl, words: b.words }} href={'#/book/' + b.id}
              onEdit={() => setForm({ book: b })} onDelete={() => setDel(b)} />
          ))}
          {empty && <AddBookCard onClick={() => setForm({})} />}
        </div>
      )}
      {books && !empty && shown.length === 0 && <EmptyState style={{ margin: '32px 0' }}>No books match. Try a different search or status.</EmptyState>}
      {empty && <EmptyState style={{ margin: '16px 0 0', maxWidth: 480 }}>Your shelf is empty. Add the book you are reading now, then start collecting words, characters and highlights.</EmptyState>}
    </>
  )

  return (
    <AppShell platform={platform}>
      {m ? <ScrollArea>{body}</ScrollArea> : <Container>{body}</Container>}
      {form && <BookForm kind={m ? 'bottom' : 'drawer'} book={form.book} books={all} onClose={() => setForm(null)}
        onSaved={(id, wasNew) => { setForm(null); if (wasNew) go('/book/' + id); else { toast('Details saved'); load() } }} />}
      {del && (
        <ConfirmDialog title={<>Delete <span>{del.title}</span>?</>} confirmLabel="Delete book" onCancel={() => setDel(null)} onConfirm={() => remove(del)}>
          This removes the book with its {del.chars} characters, {del.ties} ties, {del.hl} highlights and {del.words} words. You can undo right after.
        </ConfirmDialog>
      )}
    </AppShell>
  )
}

function BookForm({ kind, book, books, onClose, onSaved }) {
  const [title, setTitle] = useState(book?.title || ''), [author, setAuthor] = useState(book?.author || '')
  const [status, setStatus] = useState(book?.status || 'Reading'), [copy, setCopy] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const lg = kind === 'bottom' ? 'lg' : 'md'

  async function save(e) {
    e && e.preventDefault()
    const t = title.trim()
    if (!t) return setErr('Give the book a title.')
    setBusy(true); setErr('')
    if (book) {
      const { error } = await supabase.from('books').update({ title: t, author: author.trim() || null, status }).eq('id', book.id)
      setBusy(false); return error ? setErr('Could not save the details. Try again in a moment.') : onSaved(book.id, false)
    }
    const { data, error } = await supabase.rpc('create_book', {
      p_title: t, p_author: author.trim() || null, p_status: status, p_copy_from: copy || null, p_color: coverColor(books.length),
    })
    setBusy(false); error ? setErr('Could not create the book. Try again in a moment.') : onSaved(data, true)
  }
  return (
    <FormOverlay kind={kind} title={book ? 'Edit book' : 'New book'} onClose={onClose}>
      <form onSubmit={save} noValidate style={{ display: 'contents' }}>
        <Field label="Title">
          <TextInput size={lg} invalid={!!err} value={title} maxLength={200} placeholder="Book title" onChange={e => { setTitle(e.target.value); setErr('') }} />
        </Field>
        <Field label="Author (optional)">
          <TextInput size={lg} value={author} maxLength={200} placeholder="For example, M. Ostrander" onChange={e => setAuthor(e.target.value)} />
        </Field>
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Status</Eyebrow>
          <div role="group" aria-label="Status" className="app-wrap">
            {STATUSES.map(s => <Chip key={s} size={kind === 'bottom' ? 'touch' : 'md'} selected={status === s} onClick={() => setStatus(s)}>{s}</Chip>)}
          </div>
        </div>
        {!book && books.length > 0 && (
          <>
            <Field label="Tie types">
              <Select size={lg} value={copy} onChange={e => setCopy(e.target.value)}>
                <option value="">Start with none</option>
                {books.map(b => <option key={b.id} value={b.id}>Copy from {b.title}</option>)}
              </Select>
            </Field>
            <div className="app-meta">Tie types belong to each book. Copying gives the new book its own copy, so changing it later does not affect the original.</div>
          </>
        )}
        {err && <ErrorText>{err}</ErrorText>}
        <Button type="submit" disabled={busy}>{book ? 'Save changes' : 'Create book'}</Button>
      </form>
    </FormOverlay>
  )
}
