import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { Dialog, Err, Field, ago, go, useToast } from '../util.jsx'

const STATUSES = ['Reading', 'Finished', 'Paused']

export default function Library() {
  const [books, setBooks] = useState(null)
  const [hidden, setHidden] = useState([])       // ids soft-deleted this session (shown hidden until purge)
  const [filter, setFilter] = useState('All')
  const [dlg, setDlg] = useState(null)           // {kind:'new'} | {kind:'edit',book} | {kind:'delete',book}
  const [err, setErr] = useState('')
  const toast = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('library_books')
    if (error) setErr('Could not load your books. ' + error.message); else { setErr(''); setBooks(data) }
  }, [])
  useEffect(() => { load() }, [load])

  async function open(b) {
    supabase.from('books').update({ last_opened_at: new Date().toISOString() }).eq('id', b.id).then(() => {})
    go('/book/' + b.id)
  }

  async function remove(b) {
    setDlg(null)
    setHidden(h => h.concat(b.id))
    const { error } = await supabase.from('books').update({ deleted_at: new Date().toISOString() }).eq('id', b.id)
    if (error) { setHidden(h => h.filter(x => x !== b.id)); return setErr('Could not delete the book. ' + error.message) }
    toast('Deleted “' + b.title + '”', {
      undo: async () => {
        await supabase.from('books').update({ deleted_at: null }).eq('id', b.id)
        setHidden(h => h.filter(x => x !== b.id)); toast('Restored “' + b.title + '”')
      },
      ms: 8000,
    })
  }

  const shown = (books || []).filter(b => !hidden.includes(b.id) && (filter === 'All' || b.status === filter))
  const empty = books && books.filter(b => !hidden.includes(b.id)).length === 0

  return (
    <main className="page">
      <div className="row wrap" style={{ marginBottom: 18 }}>
        <h1 className="serif grow" style={{ fontSize: 30 }}>Your books</h1>
        {!empty && <button className="btn primary" onClick={() => setDlg({ kind: 'new' })}>+ New book</button>}
      </div>
      {!empty && books && (
        <div className="row wrap" style={{ marginBottom: 16 }} role="group" aria-label="Filter by status">
          {['All', ...STATUSES].map(s => <button key={s} className={'chip' + (filter === s ? ' on' : '')} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s}</button>)}
        </div>
      )}
      <Err>{err}</Err>
      {!books && !err && <p className="mute">Loading…</p>}
      {books && (
        <div className="grid">
          {shown.map(b => (
            <div key={b.id} className="card bookcard" tabIndex={0} role="link" aria-label={'Open ' + b.title}
              onClick={() => open(b)} onKeyDown={e => e.key === 'Enter' && open(b)}>
              <h3>{b.title}</h3>
              <div className="mute">{b.author || 'Author not added'}</div>
              <div className="row" style={{ marginTop: 2 }}><span className="pill">{b.status}</span></div>
              <div className="grow" />
              <div className="mute" style={{ fontSize: 13 }}>{ago(b.last_highlight_at)}</div>
              <div className="mute" style={{ fontSize: 12 }}>{b.hl} highlights · {b.chars} characters · {b.words} words</div>
              <div className="acts" onClick={e => e.stopPropagation()}>
                <button className="icon" aria-label={'Edit ' + b.title} onClick={() => setDlg({ kind: 'edit', book: b })}>✎</button>
                <button className="icon" aria-label={'Delete ' + b.title} onClick={() => setDlg({ kind: 'delete', book: b })}>🗑</button>
              </div>
            </div>
          ))}
          {empty && <button className="card dashed" onClick={() => setDlg({ kind: 'new' })}>+ Add your first book</button>}
        </div>
      )}
      {books && !empty && shown.length === 0 && <p className="mute">No books with that status.</p>}

      {dlg?.kind === 'new' && <BookDialog books={books || []} onClose={() => setDlg(null)} onSaved={id => { setDlg(null); go('/book/' + id) }} />}
      {dlg?.kind === 'edit' && <BookDialog book={dlg.book} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); load() }} />}
      {dlg?.kind === 'delete' && (
        <Dialog title={'Delete “' + dlg.book.title + '”?'} onClose={() => setDlg(null)} footer={<>
          <button className="btn" autoFocus onClick={() => setDlg(null)}>Cancel</button>
          <button className="btn danger" onClick={() => remove(dlg.book)}>Delete</button></>}>
          <p className="mute" style={{ margin: 0 }}>Its highlights, characters, ties and words go with it. You can undo for a short while.</p>
        </Dialog>
      )}
    </main>
  )
}

function BookDialog({ book, books, onClose, onSaved }) {
  const [title, setTitle] = useState(book?.title || ''), [author, setAuthor] = useState(book?.author || '')
  const [status, setStatus] = useState(book?.status || 'Reading'), [copy, setCopy] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return setErr('Give the book a title.')
    setBusy(true); setErr('')
    if (book) {
      const { error } = await supabase.from('books').update({ title: t, author: author.trim() || null, status }).eq('id', book.id)
      setBusy(false); return error ? setErr(error.message) : onSaved(book.id)
    }
    const { data, error } = await supabase.rpc('create_book', { p_title: t, p_author: author.trim() || null, p_status: status, p_copy_from: copy || null })
    setBusy(false); error ? setErr(error.message) : onSaved(data)
  }
  return (
    <Dialog title={book ? 'Edit book' : 'New book'} onClose={onClose}>
      <form className="stack" onSubmit={save} noValidate>
        <Field label="Title"><input className="inp" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Author (optional)"><input className="inp" value={author} maxLength={200} onChange={e => setAuthor(e.target.value)} /></Field>
        <Field label="Status"><select className="inp" value={status} onChange={e => setStatus(e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        {!book && books.length > 0 && (
          <Field label="Copy tie types from (optional)">
            <select className="inp" value={copy} onChange={e => setCopy(e.target.value)}>
              <option value="">Start with none</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </Field>
        )}
        <Err>{err}</Err>
        <div className="foot" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{book ? 'Save' : 'Create book'}</button>
        </div>
      </form>
    </Dialog>
  )
}
