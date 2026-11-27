-- Dog-Ear schema. Matches the "Dog-Ear: Data Model (Supabase)" document.
create extension if not exists pgcrypto;

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(title) between 1 and 200),
  author text check (length(author) <= 200),
  status text not null default 'Reading' check (status in ('Reading','Finished','Paused')),
  color text,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz  -- set on delete, cleared by Undo
);

create table tie_types (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  name text not null check (length(name) between 1 and 60),
  color_index smallint not null default 0,  -- also picks the dash pattern
  unique (book_id, name)
);

create table characters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  name text not null check (length(name) between 1 and 120),
  aliases text[] not null default '{}',
  profession text,
  first_page int,
  notes text,
  x real not null default 0,
  y real not null default 0
);

create table ties (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  from_character_id uuid not null references characters on delete cascade,
  to_character_id uuid not null references characters on delete cascade,
  tie_type_id uuid references tie_types on delete set null,  -- null = Untyped
  label text not null default '',
  check (from_character_id <> to_character_id)
);

create table words (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  word text not null check (length(word) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index words_book_word on words (book_id, lower(word));

create table highlight_labels (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  name text not null check (length(name) between 1 and 40),
  color_index smallint not null default 0,
  sort int not null default 0,
  unique (book_id, name)
);

create table highlights (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  page int not null check (page > 0),
  quote text,
  note text,
  check (coalesce(trim(quote), '') <> '' or coalesce(trim(note), '') <> ''),
  label_id uuid references highlight_labels on delete set null,  -- null = Unlabelled
  created_at timestamptz not null default now()
);

create table highlight_characters (
  highlight_id uuid not null references highlights on delete cascade,
  character_id uuid not null references characters on delete cascade,
  primary key (highlight_id, character_id)
);

-- Shared dictionary cache (not per user)
create table dictionary (
  word text primary key check (word = lower(word)),
  entry jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Admin flag
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  is_admin boolean not null default false
);

-- Invite requests from visitors
create table invite_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  note text check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now()
);
create unique index invite_requests_email on invite_requests (lower(email));

-- Indexes
create index on tie_types (book_id);
create index on characters (book_id);
create index on ties (book_id);
create index on ties (from_character_id);
create index on ties (to_character_id);
create index on highlights (book_id, page);
create index on highlight_labels (book_id);
create index on highlight_characters (character_id);
create index on books (user_id, last_opened_at desc);

-- Every new book gets the four default labels
create function seed_labels() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into highlight_labels (book_id, name, color_index, sort)
  values (new.id, 'Clue', 0, 0), (new.id, 'Quote', 1, 1), (new.id, 'Question', 2, 2), (new.id, 'Theme', 3, 3);
  return new;
end $$;
create trigger books_seed_labels after insert on books
  for each row execute function seed_labels();

-- A tie may only join two characters of the tie's own book
create function check_tie_books() returns trigger
  language plpgsql set search_path = public as $$
begin
  if (select count(*) from characters where id in (new.from_character_id, new.to_character_id) and book_id = new.book_id) <> 2 then
    raise exception 'tie characters must belong to the tie''s book';
  end if;
  return new;
end $$;
create trigger ties_same_book before insert or update on ties
  for each row execute function check_tie_books();

-- Every account gets a profile row (is_admin false until you flip it by hand)
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
insert into profiles (user_id) select id from auth.users on conflict do nothing;
-- Row Level Security: the anon key is public, so this is the only wall between users.

create function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where user_id = (select auth.uid())), false)
$$;

create function owns_book(b uuid) returns boolean
  language sql stable security invoker as $$
  select exists (select 1 from books where id = b and user_id = (select auth.uid()))
$$;

alter table books enable row level security;
create policy own_books on books for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table tie_types enable row level security;
create policy own_tie_types on tie_types for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table characters enable row level security;
create policy own_characters on characters for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table ties enable row level security;
create policy own_ties on ties for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table words enable row level security;
create policy own_words on words for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table highlight_labels enable row level security;
create policy own_labels on highlight_labels for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table highlights enable row level security;
create policy own_highlights on highlights for all to authenticated
  using (owns_book(book_id)) with check (owns_book(book_id));

alter table highlight_characters enable row level security;
create policy own_hl_chars on highlight_characters for all to authenticated
  using (exists (select 1 from highlights h where h.id = highlight_id and owns_book(h.book_id)))
  with check (exists (select 1 from highlights h where h.id = highlight_id and owns_book(h.book_id)));

alter table dictionary enable row level security;
create policy read_dictionary on dictionary for select to authenticated using (true);

alter table profiles enable row level security;
create policy read_own_profile on profiles for select to authenticated
  using (user_id = (select auth.uid()));

alter table invite_requests enable row level security;
-- visitors may add a pending request and nothing else
create policy anyone_can_request on invite_requests
  for insert to anon with check (status = 'pending');
create policy admin_reads_requests on invite_requests
  for select to authenticated using (is_admin());
create policy admin_updates_requests on invite_requests
  for update to authenticated using (is_admin()) with check (is_admin());
-- Functions called from the browser with supabase.rpc()

create function library_books()
returns table (id uuid, title text, author text, status text, color text, last_opened_at timestamptz,
               last_highlight_at timestamptz, chars bigint, ties bigint, hl bigint, words bigint)
language sql stable security invoker as $$
  select b.id, b.title, b.author, b.status, b.color, b.last_opened_at,
    (select max(created_at) from highlights where book_id = b.id),
    (select count(*) from characters where book_id = b.id),
    (select count(*) from ties where book_id = b.id),
    (select count(*) from highlights where book_id = b.id),
    (select count(*) from words where book_id = b.id)
  from books b where b.deleted_at is null order by b.last_opened_at desc
$$;

create function create_book(p_title text, p_author text default null,
                            p_status text default 'Reading', p_copy_from uuid default null)
returns uuid language plpgsql security invoker as $$
declare new_id uuid;
begin
  insert into books (title, author, status) values (p_title, nullif(trim(p_author), ''), p_status) returning id into new_id;
  if p_copy_from is not null then
    insert into tie_types (book_id, name, color_index)
    select new_id, name, color_index from tie_types where book_id = p_copy_from;
  end if;
  return new_id;
end $$;

create function export_my_data() returns jsonb
language sql stable security invoker as $$
  select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object(
    'tie_types',  (select coalesce(jsonb_agg(t), '[]') from tie_types t where t.book_id = b.id),
    'characters', (select coalesce(jsonb_agg(c), '[]') from characters c where c.book_id = b.id),
    'ties',       (select coalesce(jsonb_agg(x), '[]') from ties x where x.book_id = b.id),
    'words',      (select coalesce(jsonb_agg(w), '[]') from words w where w.book_id = b.id),
    'labels',     (select coalesce(jsonb_agg(l), '[]') from highlight_labels l where l.book_id = b.id),
    'highlights', (select coalesce(jsonb_agg(to_jsonb(h) || jsonb_build_object('character_ids',
                    (select coalesce(jsonb_agg(hc.character_id), '[]') from highlight_characters hc
                     where hc.highlight_id = h.id))), '[]') from highlights h where h.book_id = b.id)
  )), '[]')
  from books b where b.deleted_at is null
$$;

create function cache_definition(p_word text, p_entry jsonb) returns void
  language sql security definer set search_path = public as $$
  insert into dictionary (word, entry)
  select lower(p_word), p_entry where length(p_entry::text) < 20000
  on conflict (word) do nothing
$$;
revoke all on function cache_definition from public;
grant execute on function cache_definition to authenticated;

-- Design system support: book cover colours and dictionary suggestions as you type.

-- create_book now stores the cover colour the app picks (the design's book-cover order).
drop function if exists create_book(text, text, text, uuid);
create function create_book(p_title text, p_author text default null,
                            p_status text default 'Reading', p_copy_from uuid default null,
                            p_color text default null)
returns uuid language plpgsql security invoker as $$
declare new_id uuid;
begin
  insert into books (title, author, status, color)
  values (p_title, nullif(trim(p_author), ''), p_status, nullif(trim(p_color), ''))
  returning id into new_id;
  if p_copy_from is not null then
    insert into tie_types (book_id, name, color_index)
    select new_id, name, color_index from tie_types where book_id = p_copy_from;
  end if;
  return new_id;
end $$;

-- Give existing books a cover colour: blue, yellow, green, pink, violet, cyan, coral, sand, in creation order per reader.
with ordered as (
  select id, (row_number() over (partition by user_id order by created_at) - 1) % 8 as n
  from books where color is null
)
update books b
set color = (array['#8fb0ff','#ffd166','#5fd49a','#ff9ecb','#b79cf0','#5fd0e6','#ff8f86','#c9b79c'])[o.n + 1]
from ordered o where b.id = o.id;

alter table books add constraint books_color_hex check (color is null or color ~ '^#[0-9a-fA-F]{6}$');

-- Prefix search over the shared dictionary cache (word like 'abc%').
create index if not exists dictionary_word_prefix on dictionary (word text_pattern_ops);

-- Two-way ties and character notes as cards.

-- A tie can point both ways (A <-> B). Its one label reads for both ("rivals", "siblings").
alter table ties add column if not exists both_ways boolean not null default false;

-- A character's notes become a list of cards, in the reader's order: [{ "id", "text", "page" }].
alter table characters add column if not exists note_cards jsonb not null default '[]'::jsonb;
alter table characters add constraint characters_note_cards_array check (jsonb_typeof(note_cards) = 'array');

-- Each existing note becomes that character's first card. The old column stays (empty) for older app versions.
update characters
set note_cards = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'text', trim(notes), 'page', null)),
    notes = null
where coalesce(trim(notes), '') <> '' and note_cards = '[]'::jsonb;

-- Daily purge of books deleted more than a day ago (cascades to everything under them).
-- If this line fails, enable pg_cron first: Dashboard > Database > Extensions > pg_cron.
create extension if not exists pg_cron;
select cron.schedule('purge-deleted-books', '15 3 * * *',
  $$ delete from books where deleted_at < now() - interval '1 day' $$);
