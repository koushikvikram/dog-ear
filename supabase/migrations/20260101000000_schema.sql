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
