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
