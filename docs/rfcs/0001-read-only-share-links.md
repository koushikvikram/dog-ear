# RFC 0001: Read-only share links for books

| | |
|---|---|
| **Status** | Parked |
| **Created** | 2026-11-27 |
| **Last updated** | 2026-11-27 |
| **Estimate** | About 2–3 days of focused work |
| **Revisit when** | A reader asks to show a book's notes to someone without an account (a book club, a teacher, a friend reading the same book) |

## Summary

Let the owner of a book create a link that anyone can open, without signing in, to see that book's highlights, characters and words, read-only. The owner can stop sharing at any time, which breaks the link.

## Why it is parked

The idea is sound and the design below is ready to build, but it changes Dog-Ear's privacy promise ("Your notes are stored privately in your account. Nobody else can read them.") and adds the app's first public read path. It should wait until there is a real need for it, and the open questions at the end should be answered first.

## Motivation

Dog-Ear is invite-only and every book is private to its owner. Readers sometimes want to show their notes to someone else: a book club before a meeting, a friend reading the same book, a student handing in reading notes. Today the only way is Export my data, which produces JSON nobody wants to read.

## Goals

- The owner can turn sharing on for one book and get a link.
- Anyone with the link sees the book read-only, on desktop and phone, without an account.
- The owner can stop sharing, and can replace the link (which breaks the old one).
- Nothing the visitor sees reveals who the owner is (no email, no user id).
- No change to what signed-in members can see of each other's books (nothing).

## Non-goals

- Editing by anyone other than the owner, or comments from visitors.
- Sharing with named people or accounts (permissions per person).
- Sharing a whole library at once.
- Analytics such as view counts.
- Public discovery: shared books are not listed anywhere or indexed by search engines.

## How things work today

- All protection is in Postgres Row Level Security (README §3). Every policy is `to authenticated` and checks `owns_book(book_id)`. A visitor using the public anon key can read nothing.
- README §3.5 says: "Do not add a `for all to anon` policy to anything." This proposal keeps that rule.
- The app routes everyone without a session to the welcome page ([`src/App.jsx`](../../src/App.jsx)), remembering the deep link for after sign-in.
- Routing is hash-based (`#/book/<id>`), so the part after `#` is never sent to a server.
- [`export_my_data()`](../../supabase/migrations/20260101000200_functions.sql) already gathers a book with everything under it as JSON; the share function is a narrower copy of it.

## Proposed design

### 1. Data model

One nullable column on `books`. Empty means not shared.

```sql
alter table books add column share_token text unique
  check (share_token is null or length(share_token) >= 32);
```

The token is a long random string, separate from the book's id, so that:

- stopping sharing (`share_token = null`) and replacing the link (a new token) never touch the book's id, which the owner's own URLs use;
- a link can't be built from anything the owner has shown elsewhere.

Two owner-only functions set it. Both are `security invoker`, so RLS still decides whose book it is:

```sql
create function share_book(p_book uuid) returns text
  language sql security invoker set search_path = public, extensions as $$
  update books
  set share_token = translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_')  -- 32 URL-safe characters
  where id = p_book
  returning share_token
$$;

create function unshare_book(p_book uuid) returns void
  language sql security invoker set search_path = public as $$
  update books set share_token = null where id = p_book
$$;
```

`share_book` doubles as "replace the link": calling it again issues a new token.

### 2. Reading a shared book

**One `security definer` function, callable by `anon`, instead of opening the tables.** It returns the shared book as one JSON document, the way `export_my_data()` does, and nothing else.

```sql
create function shared_book(p_token text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'book',       jsonb_build_object('title', b.title, 'author', b.author, 'color', b.color),
    'tie_types',  (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color_index', t.color_index)), '[]')
                   from tie_types t where t.book_id = b.id),
    'characters', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'aliases', c.aliases,
                     'profession', c.profession, 'first_page', c.first_page, 'note_cards', c.note_cards, 'x', c.x, 'y', c.y)), '[]')
                   from characters c where c.book_id = b.id),
    'ties',       (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'from_character_id', x.from_character_id,
                     'to_character_id', x.to_character_id, 'tie_type_id', x.tie_type_id, 'label', x.label, 'both_ways', x.both_ways)), '[]')
                   from ties x where x.book_id = b.id),
    'labels',     (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'color_index', l.color_index, 'sort', l.sort)), '[]')
                   from highlight_labels l where l.book_id = b.id),
    'highlights', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'page', h.page, 'quote', h.quote, 'note', h.note,
                     'label_id', h.label_id, 'created_at', h.created_at,
                     'mentions', (select coalesce(jsonb_agg(hc.character_id), '[]') from highlight_characters hc where hc.highlight_id = h.id))), '[]')
                   from highlights h where h.book_id = b.id),
    'words',      (select coalesce(jsonb_agg(jsonb_build_object('word', w.word, 'entry', d.entry)), '[]')
                   from words w left join dictionary d on d.word = lower(w.word) where w.book_id = b.id)
  )
  from books b
  where p_token is not null and b.share_token = p_token and b.deleted_at is null
$$;
revoke all on function shared_book from public;
grant execute on function shared_book to anon, authenticated;
```

Why a function rather than `anon` policies on each table:

- **One narrow door.** Nine relaxed policies would each have to check a token the client sends, and a mistake in any one leaks data. One function with an explicit column list is easy to review.
- **Explicit fields.** It names every column it returns, so private fields (`user_id`, `deleted_at`, `last_opened_at`, `notes`) can't leak, and a column added later stays private until someone adds it here.
- **Definitions included.** Visitors can't read the `dictionary` table, so each word's cached entry travels with it.
- **Deleted books vanish.** A book in the bin (`deleted_at` set) stops resolving at once, before the nightly purge.

An unknown, cleared or replaced token returns `null`, and the page shows "This link is no longer shared." without saying whether the book exists.

### 3. App routing

- A public route, `#/s/<token>`, handled in `App.jsx` **before** the sign-in check, so a visitor is not sent to the welcome page.
- Signed-in owners opening their own link see the same read-only view (useful to check what others see), with a link back to the editable book.
- The token stays after `#`, so browsers never send it to a server or include it in `Referer` headers.
- The page adds `<meta name="robots" content="noindex">` while it is showing.

### 4. The read-only screen

The same layout as Book, with every editing control absent rather than disabled:

| Section | Approach | Effort |
|---|---|---|
| Highlights | Reuse the design system's `HighlightRow` (desktop) and `HighlightCard` (phone, without its trash button), filtered by label chips like today. No quick capture. | Small |
| Lexicon | Reuse `WordCard` with the definitions from `shared_book`. No search or add. | Small |
| Characters | A **separate, slimmer viewer**, not a read-only flag threaded through [`Characters.jsx`](../../src/components/Characters.jsx). That file mixes viewing with editing in about 47 places (drag, tie handles, drawers, popovers). The viewer reuses the pan and zoom hook and the tie geometry in [`graph.js`](../../src/components/graph.js), draws nodes without the green handle, and opens a read-only character card on click: names, note cards, ties and tagged highlights. | The bulk of the work |

The data hook returns the same shape as `useBookData` (`characters`, `ties`, `highlights`…), so display code can be shared without the write methods.

### 5. The owner's side

- A **Share** action on the Book screen (the book switcher area on desktop, the app header on phone) opens a dialog:
  - off: one sentence on what sharing means, and **Share read-only link**;
  - on: the link with **Copy**, **Replace link** (explains the old one stops working) and **Stop sharing**.
- Library cards show a small "Shared" badge on shared books, so sharing is never forgotten.
- Copy changes: the welcome page's privacy line becomes "Your notes are stored privately in your account. Nobody else can read them unless you share a book."; README §3.2 gains the visitor's new right (read a book by its share link).

### 6. Design system

New patterns to add to the Dog-Ear design system before building (none exist today):

- the Share dialog (link field with Copy, the two follow-up actions);
- the read-only Book screen on both platforms (header without editing actions, a "Read-only" marker);
- the "Shared" badge on `BookCard`;
- `CharacterNode` without its tie handle (today the handle is always drawn).

## Security and privacy

- **A link is a bearer secret.** Anyone who has it can read the book, and it can be forwarded. The dialog says so in one sentence. Stop sharing and Replace link are the remedies.
- **Guessing.** 24 random bytes (192 bits) can't be guessed; a `unique` index makes lookups fast and collisions impossible to rely on.
- **No owner identity.** The function never returns `user_id` or an email.
- **Rate limits.** Supabase's API rate limits apply to the RPC like any other request. Nothing extra is needed at this scale.
- **Search engines.** `noindex`, and the token is in the hash, so crawlers following a stray link see only the app shell.
- **Tests to add to README §3.6.** Signed out, `rpc('shared_book', { p_token: <valid> })` returns the book; with a random token, `null`; after Stop sharing, `null`; `select * from books` with the anon key still returns `[]`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| `anon` RLS policies on each table that check a token | Breaks the README §3.5 rule; nine policies to get right instead of one function; easy to leak a column added later. |
| Use the book's id as the link | Can't be revoked or replaced without changing the id, and the id already appears in the owner's own URLs. |
| A static snapshot (export to a file or a public page) | Frozen at export time, so it goes stale; a second rendering path to maintain. Could return as an option if the open question on live versus snapshot goes that way. |
| An Edge Function that signs short-lived URLs | More moving parts (a function, a signing secret, expiry handling) for little gain over a revocable token at this scale. |
| Accounts for viewers | Defeats the point (viewing without signing in) and conflicts with invite-only. |

## Effort

| Part | Estimate |
|---|---|
| Migration: column, `share_book`, `unshare_book`, `shared_book`, grants | Half a day |
| Owner UI: Share dialog, Library badge, copy changes | Half a day |
| Read-only screen: route, data hook, Highlights, Lexicon | Half a day |
| Read-only character viewer | 1 day |
| Design system additions, README updates, mock backend for tests | Half a day |
| **Total** | **About 2–3 days** |

## Rollout

1. Apply the migration (it only adds a column and functions; existing data and policies are untouched).
2. Ship the read-only route first, then the Share dialog, so links never point at a missing page.
3. Update the privacy line and README §3 in the same release as the Share dialog.

## Open questions

1. **Live or snapshot?** Should visitors always see the latest notes (this design), or what the book looked like when it was shared?
2. **What is included?** All four parts (highlights, characters, notes, words), or a choice per link? Character note cards may be more personal than highlights.
3. **Expiry?** Should links expire after a set time, or only when sharing is stopped?
4. **Phone owners.** Is a Share action needed on phone in the first version, or desktop only?
5. **Owner name.** Should the shared page show who shared it ("Shared by Ines") or stay anonymous (this design)?
