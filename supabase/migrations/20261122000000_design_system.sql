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
