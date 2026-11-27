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
