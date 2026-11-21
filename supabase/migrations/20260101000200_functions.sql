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

-- Daily purge of books deleted more than a day ago (cascades to everything under them).
-- If this line fails, enable pg_cron first: Dashboard > Database > Extensions > pg_cron.
create extension if not exists pg_cron;
select cron.schedule('purge-deleted-books', '15 3 * * *',
  $$ delete from books where deleted_at < now() - interval '1 day' $$);
