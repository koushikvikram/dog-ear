# RFC 0002: Reading assistant, camera highlights and barcode books

| | |
|---|---|
| **Status** | Draft |
| **Created** | 2026-11-27 |
| **Last updated** | 2026-11-27 |
| **Estimate** | About 3–3½ weeks of focused work, in five phases that can ship one at a time; open-model routing later, about a week more |
| **Depends on** | An Anthropic API account and key; no other RFC |

## Summary

Three additions that let a reader use Dog-Ear with the book in their hands:

1. **A reading assistant** inside each book that you can type or talk to, and that answers in text and, if you like, out loud. It looks up word meanings and offers to add new ones to the Lexicon, does everything the character graph can do (characters, ties, tie types, notes), answers questions about your words, characters and highlights, and manages highlights and their labels.
2. **Camera highlights:** photograph the page, mark the passage, check and edit the text Dog-Ear reads from it, then finish the highlight as today (page, label, who is in it, your thought).
3. **Barcode books:** scan the barcode on the back of a book to create it in your library with its title and author, unless it is already there.

It also weighs open models (including small ones) against Claude's paid API, covers how to host them, and lists what else an agent system like this needs beyond the model.

## Motivation

Dog-Ear is used while reading a physical book, often on a phone held in one hand. Today every action is typed: copying a quote word by word, creating characters one field at a time, adding a book by typing its title. Each of these features removes typing at the moment it is most awkward.

## Goals

- **Assistant, words.** Ask what a word means and get the definition. If the word is not in this book's Lexicon, the assistant asks whether to add it; if it is already there, it does not ask.
- **Assistant, character graph.** Anything the Characters tab does, by request: create, rename and remove characters; aliases; role and first page; note cards; ties in either direction, two-way ties and merging; tie types; auto-arrange; showing a character on the graph.
- **Assistant, questions.** Answer questions about the book's words (meanings, when they were added), characters (who they are, their notes, who they are tied to and how) and highlights (by character, label, page or content).
- **Assistant, highlights.** Create, edit and remove highlights and manage highlight labels by request, and start a camera capture.
- **Voice.** Speak instead of typing, and hear replies, wherever the browser allows it. Text always works.
- **Camera highlights.** Photo, select the region, extract the text, confirm or edit it, then the normal highlight details.
- **Barcode books.** Scan an ISBN barcode; create the book with title and author; if a book with that ISBN, or the same title and author, already exists, open it instead.
- **Nothing becomes less private than it must.** Every change still goes through Row Level Security as the signed-in reader, and the reader can see and undo what the assistant did.

## Non-goals

- A hands-free wake word ("Hey Dog-Ear"). Voice starts with a tap.
- Moving characters to exact positions by voice ("put Elara top left"). Auto-arrange and "show Elara" are in; free placement stays a drag.
- An assistant across the whole library ("which of my books mention Calder?"). It works inside one book.
- Reading whole pages into the app or summarising the book. The camera captures the passage you mark.
- Storing chat transcripts in Dog-Ear's database.
- Barcodes other than book ISBNs (EAN-13 starting 978 or 979).
- Working offline. All three features need a connection; each falls back to the manual way.

## How things work today

- **Static site plus Supabase.** The browser holds only the public anon key; Row Level Security is the only wall between readers (README §3). There is no server of our own, apart from one Edge Function (`invite-user`).
- **Every write already has a function.** [`useBookData`](../../src/pages/useBookData.js) exposes `addCharacter`, `updateCharacter`, `removeCharacter`, `addTie`, `updateTie`, `removeTie`, `mergeTies`, the tie type and label functions, `addHighlight`, `updateHighlight`, `removeHighlight`, `addWord` and `removeWord`, with optimistic updates and the 6-second Undo toast for removals. The assistant's tools should call these, not the database directly, so the screen updates as the assistant works.
- **Dictionary.** [`Lexicon.jsx`](../../src/components/Lexicon.jsx) looks a word up in the shared `dictionary` cache, then dictionaryapi.dev, then caches the result; Datamuse supplies suggestions.
- **Voice input already exists.** `useDictation` in [`util.jsx`](../../src/util.jsx) uses the browser's Speech Recognition for the highlight form and the Lexicon.
- **Books.** `create_book(p_title, p_author, …)` creates a book; books have no ISBN today.
- **Offline.** Only highlight capture queues offline ([`offline.js`](../../src/offline.js)).

## Proposed design

### 1. Architecture

![Architecture: the reader's browser runs the Dog-Ear web app (assistant panel, tool runner, voice, camera capture, barcode scanner). Supabase holds two Edge Functions, auth and secrets, and Postgres with Row Level Security. Anthropic's API runs Claude Opus 5.5 for the assistant and to read the cropped passage. Public web APIs supply definitions and book details. Numbered steps 1 to 9 trace each flow.](assets/0002-architecture.svg)

The numbered steps in the picture follow one request through each flow: a chat message (1–6), a camera highlight (7), a barcode (8) and a word lookup (9).

Two rules shape it:

- **The API key never reaches the browser.** It lives in Edge Function secrets, like the service key does today. The functions check the reader's JWT the way `invite-user` does, so only members can use them.
- **Tools run in the browser, as the reader.** Claude never touches the database. When it wants to "add a tie", the browser runs `d.addTie(...)` with the reader's own session, so RLS applies exactly as it does when the reader clicks. Claude can't reach another reader's data, and the graph updates live.

### 2. Which Claude surface

Both options below use **custom tools that the browser executes**. They differ in who runs the conversation loop and who keeps the history.

**Option A (recommended default): Claude Managed Agents.** Anthropic hosts the agent loop and the conversation state. Dog-Ear defines the assistant once (model, system prompt, tools) as a versioned agent, kept as files and synced with `ant apply`. Each chat is a session:

1. The browser asks `assistant` to start a session for a book; the function creates it and records `(user, book, session)` so later calls can be checked.
2. The browser sends the reader's message (`user.message`) through the function and reads the session's event stream through it.
3. When Claude calls a tool, the stream carries an `agent.custom_tool_use` event and the session goes idle. The browser runs the tool and sends back `user.custom_tool_result`.
4. Claude's reply arrives as `agent.message` events, streamed as it is written.

What to know: Managed Agents is in **beta**; it bills **session runtime** ($0.08 per session-hour, only while the session is running, not while it waits for the reader) on top of tokens; and it **keeps each session's event history until the session is deleted**, so Dog-Ear must delete sessions when a chat is cleared and on a schedule (see Privacy). It also provisions a tool container per session, which this assistant does not use.

**Option B: the Messages API, loop in the browser.** `assistant` is a stateless streaming proxy for `POST /v1/messages`. The browser keeps the conversation, sends it with each request, runs tool calls, and calls again until Claude stops asking for tools. Generally available, nothing retained beyond Anthropic's standard API retention, no runtime charge; Dog-Ear owns the loop, the history and its growth (compaction or a cap on turns).

Both are a reasonable fit; the choice is open question 1. Everything else in this RFC works the same with either, except one thing: Managed Agents runs Claude only, so if open models might be used later (see [Open models instead of a paid API](#open-models-instead-of-a-paid-api)), Option B keeps that door open.

### 3. Model and settings

- **Model: Claude Opus 5.5 (`claude-opus-5-5`)**, the current default model: $4 / $20 per million input / output tokens, cache reads $0.20 per million, 1M-token context, vision included.
- **Effort `low`** for the assistant (conversational, short tool calls; raise only if measured quality needs it). Thinking can't be turned off on this model; effort is the control.
- **Tool use:** Claude chooses tools itself (forcing a particular tool is not accepted on this model), and may call several at once ("add Elara, Mara and Tobias"). On the Messages API, `strict: true` on every tool guarantees arguments match their schemas; the browser validates every tool input against its schema anyway before running it, on either option.
- **Refusals:** on the Messages API, set the server-side fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); check what Managed Agents offers before building. Either way, show a plain "I can't help with that" when a request is declined (`stop_reason: "refusal"`).
- **Prompt caching:** the system prompt and tool definitions are identical for every reader and every turn, so they are cached (automatic caching); nothing that changes per request (dates, book titles) goes in the system prompt. The book's name and counts go in the first user message instead.
- **Streaming:** replies stream into the panel, and speech starts sentence by sentence.

### 4. Tools

About 30 tools, grouped as below. Each maps onto an existing `useBookData` function or a small read helper. Every tool works on **the open book only**.

| Group | Tools | Notes |
|---|---|---|
| Words | `look_up_word`, `list_words`, `get_word`, `add_word`, `remove_word` | `look_up_word` reuses the Lexicon's lookup and returns `in_lexicon: true/false` |
| Characters | `list_characters`, `get_character`, `create_character`, `update_character` (name, role, first page), `add_alias`, `remove_alias`, `remove_character` | `get_character` returns aliases, note cards, ties and tagged highlights |
| Note cards | `add_note_card`, `edit_note_card`, `remove_note_card`, `move_note_card` | |
| Ties | `create_tie` (from, to, type, words, `both_ways`), `update_tie`, `remove_tie`, `merge_ties` | |
| Tie types | `list_tie_types`, `create_tie_type`, `rename_tie_type`, `remove_tie_type`, `copy_tie_types` | colour stays a click |
| Graph view | `show_character` (select and centre it), `arrange_graph` | UI only, no data change |
| Highlights | `search_highlights` (text, character, label, pages), `create_highlight`, `update_highlight`, `remove_highlight`, `capture_highlight_from_camera` | the last one opens the camera flow and returns when the reader saves or cancels |
| Labels | `list_labels`, `create_label`, `rename_label`, `remove_label` | |
| Undo | `undo_last_change` | for readers who can't see the toast |

**People are named in words, so the browser resolves names.** Tools take names, not ids. The browser matches them against names, first names and aliases, case-insensitively. If one name matches two characters, the tool returns an error listing them and Claude asks which one. If none matches, Claude offers to create the character.

**Word follow-up (goal 1) is enforced twice.** The system prompt says to offer adding a word only when `look_up_word` returns `in_lexicon: false`. The panel also shows an **Add to Lexicon** quick reply under that answer, so the rule holds even if the model words its reply differently, and one tap or "yes" adds it.

**Every change is visible and reversible.** Each tool result appears in the chat as a one-line activity row ("Tie added: Elara → Mara, mother of") with Undo. Removals keep the app's 6-second Undo. If one request would make more than five changes, or remove a character with ties, the assistant lists them and asks before doing them.

### 5. Voice

| Direction | How | Support (check at build time) |
|---|---|---|
| Speech in | Reuse `useDictation` (browser Speech Recognition) on a mic button in the panel: tap, speak, the text appears and sends. | Chrome, Edge and Safari on desktop and phone; not Firefox, where the mic is hidden and typing works. In Chrome the audio goes to Google's speech service. |
| Speech out | The browser's speech synthesis (`speechSynthesis`) reads the reply, sentence by sentence as it streams, without markdown. | All major browsers; voice quality varies by device. Phones need one tap first before audio can play. |

**Speak replies** is a per-device setting. It turns on by itself for a reply to a spoken question and stays off for typed ones. Cloud speech services would sound better but add another provider, cost and privacy terms. They are left out; see open question 5.

### 6. Camera highlights

1. **Take the photo** with the phone's own camera: `<input type="file" accept="image/*" capture="environment">`. This gives the full-resolution camera app, focus and flash with no camera-permission screen of our own. On desktop it opens the file picker or webcam.
2. **Select the passage.** The photo fills the screen with a rectangle the reader drags to cover the passage, pinch to zoom. A rectangle is easier on a phone than a free-hand outline.
3. **Crop in the browser.** Only the selected region is cut out (canvas), scaled so its long edge is at most 1,600 px, and saved as JPEG. The rest of the photo never leaves the phone.
4. **Read the text.** `read-passage` sends the crop to Claude Opus 5.5 with a short instruction: return exactly the printed words, joining words broken across lines, keeping the book's punctuation and italics as plain text, as structured JSON (`{ text, unclear_words }`).
5. **Confirm and edit.** The text appears in the existing highlight form's **Quote** field, with any unclear words marked, so the reader can fix them. Everything else is today's form: page, label, who is in it, their thought, Dictate.

Claude vision is chosen over on-device OCR (Tesseract.js) because page photos are curved, angled and unevenly lit, which on-device engines read poorly, and it saves a large download. Tesseract stays the fallback if cost or privacy rules out sending the crop (open question 4).

The image limits are not a concern: one JPEG under 10 MB and at most 8,000 px a side. A 1,600 × 900 crop is about 58 × 33 = 1,914 visual tokens.

**Page number.** The reader types it as today. Reading it from the photo would need the whole page sent and is left out (open question 3).

### 7. Barcode books

1. **Scan.** A Scan barcode button next to New book opens a live camera view (`getUserMedia`, rear camera). It decodes with the browser's built-in `BarcodeDetector` where it exists (Chrome on Android and macOS), and with a small WebAssembly decoder (ZXing-based) everywhere else, including iPhone Safari. It accepts only EAN-13 codes starting 978 or 979.
2. **Look it up** with Open Library by ISBN for title and author, falling back to Google Books. Both are free, need no key and are called from the browser, like the dictionary APIs today.
3. **Check for duplicates** before creating anything: the same ISBN in the reader's books, then the same title and author, ignoring case. If found, say "Already in your books" and open it.
4. **Create** with `create_book`, title and author filled in and editable before saving. If nothing is found, the New book form opens with the ISBN kept, so the reader types the title.

### 8. Data model

```sql
-- Books remember their ISBN, so a second scan finds the book.
alter table books add column isbn text check (isbn is null or isbn ~ '^97[89][0-9]{10}$');
create unique index books_user_isbn on books (user_id, isbn) where isbn is not null and deleted_at is null;
-- create_book gains p_isbn text default null.

-- Per-reader daily use, so one reader (or a bug) can't run up the bill.
create table ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);
alter table ai_usage enable row level security;
create policy read_own_usage on ai_usage for select to authenticated using (user_id = (select auth.uid()));
-- Written only by the Edge Functions with the service key.

-- Option A only: which Managed Agents session belongs to which reader and book, for checks and clean-up.
create table ai_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  book_id uuid not null references books on delete cascade,
  created_at timestamptz not null default now()
);
alter table ai_sessions enable row level security;  -- no policies: only the Edge Function reads and writes it
```

### 9. Edge Functions

| Function | Does | Checks |
|---|---|---|
| `assistant` | Starts and deletes sessions and relays events (Option A), or proxies streaming Messages requests (Option B) | Valid JWT; the book belongs to the reader; the session belongs to the reader; today's quota |
| `read-passage` | One vision request per capture; returns `{ text, unclear_words }` | Valid JWT; image type and size; quota |

Both record token usage in `ai_usage` from each response's `usage`. Supabase Edge Functions limit how long one request may run, so the event stream reconnects without losing events when the function times out.

### 10. Interface

- **Desktop:** an **Ask** button in the Book header opens the assistant as a right-hand drawer, so the graph or highlights stay visible beside it.
- **Phone:** a fourth bottom tab, **Ask**, between Characters and Lexicon. The panel has the message list, a text field, a mic button, a speaker toggle, and quick replies.
- **Camera capture:** a camera button in quick capture (both platforms), and the assistant's `capture_highlight_from_camera`.
- **Barcode:** Scan barcode beside New book in Your books and in the book switcher.
- **Privacy notice:** the first time someone opens the assistant or the camera reader, one screen says what is sent to Anthropic and what isn't, with a link to turn the features off.

### 11. Design system

New patterns for the Dog-Ear design system before building: the assistant drawer and tab, message bubbles (reader, assistant, streaming), the tool activity row with Undo, quick-reply chips, the mic and speaker states, the photo crop screen, the barcode scanner view, and the AI privacy notice. `SectionHeader`, `HighlightRow`, `Chip`, `ActionBanner` and `Toast` are reused as they are.

## Security and privacy

- **What leaves the browser:** the reader's messages, tool results (names, notes, highlights and words from the open book, as needed), and the cropped passage image go to Anthropic. Nothing from other books or other readers can, because tools only read the open book through the reader's own session. The full page photo stays on the phone.
- **Retention:** with Option A, session histories stay at Anthropic until deleted. Dog-Ear deletes the session when the reader clears the chat or leaves the book, and a daily clean-up deletes any session older than a day. With Option B, nothing is kept beyond Anthropic's standard API retention.
- **Consent:** the features are off until the reader turns them on, and the welcome page's privacy line gains "…AI features, when you turn them on, send what you ask about to Anthropic."
- **Prompt injection:** quotes, notes and OCR text are the reader's own, but a quote could still contain text that reads like an instruction. The tools can only change the reader's own open book, there are no web or email tools to send data anywhere, large or destructive batches ask first, and everything can be undone. That bounds the damage to "the reader's own book, reversibly".
- **Cost abuse:** functions refuse requests without a valid member JWT; a daily quota per reader (for example 200 requests) and a monthly spend limit in the Anthropic Console cap the bill.
- **Speech:** Chrome's speech recognition sends audio to Google; the privacy notice says so.
- **Tests:** a signed-out call to either function returns 401; a session id belonging to another reader is refused; tools can't read another book; quota exhaustion returns a clear message.

## Cost

Estimates for Claude Opus 5.5 at effort `low`, to be checked against real `usage` numbers in phase 3.

| Item | Assumption | Cost |
|---|---|---|
| One assistant step | ~6,000 cached tokens (system prompt and tools, $0.20 / M), ~1,000 new input tokens ($4 / M), ~400 output tokens including thinking ($20 / M) | ≈ $0.013 |
| A simple request ("what does *lading* mean?") | 2 steps | ≈ $0.03 |
| A multi-step request ("add Elara and Mara, Mara is her mother") | 3–5 steps | ≈ $0.04–0.07 |
| Cache write at the start of a chat | 6,000 tokens at $5 / M, once per 5 minutes of inactivity | ≈ $0.03 |
| Managed Agents runtime (Option A) | ~10 seconds running per request at $0.08 / hour | ≈ $0.0002 |
| One camera read | ~1,900 visual tokens + ~300 prompt tokens in, ~300 out | ≈ $0.015 |
| Barcode lookup | Open Library | free |

A reader who makes 20 assistant requests and 5 camera captures in a day costs roughly **$0.80–1.20 that day**. A lighter day (5 requests) is about **$0.20**. Cheaper models (Claude Sonnet 5.5 at $2 / $10, Claude Haiku 5.5 at $0.10 / $0.50) would cut this a lot, but whether they handle the tools well enough has to be measured first; that is the owner's decision (open question 2).

## Open models instead of a paid API

Written from the point of view of the AI engineer who would build this. The model names and prices are examples at the time of writing; open models change every few months, so check current releases before choosing.

![Open-model design: the browser keeps the same assistant panel and tool runner, and can optionally run a small model, Whisper and Tesseract on the device. A Supabase Edge Function becomes a model-neutral gateway with a command parser, a router and adapters. The backends are Claude, hosted open-model APIs, or your own GPU server running vLLM, Whisper and OCR. Every turn is traced and scored against an evaluation set.](assets/0002-open-models.svg)

### What the assistant actually has to do

Each part of the job is a different difficulty, so it helps to split it:

| Job | Example | How hard for a model |
|---|---|---|
| Fixed-shape commands | "add the word lading", "add Mara as a character" | Easy: a rules parser or a tiny model can do it |
| Commands with names and relations | "Mara is Elara's mother, add that as a family tie" | Medium: pick the tool, resolve two names, choose the direction and the words |
| Multi-step requests | "add Wren and Tobias, Wren works for Tobias, and tag both in the page 44 highlight" | Hard: plan several calls and carry results from one to the next |
| Questions about the book | "who is Calder tied to, and why does Wren steal from him?" | Medium to hard: fetch with tools, then answer only from what was fetched |
| Word meanings | "what does brackish mean?" | No model needed: the dictionary API answers; a model only phrases it |
| Reading a passage | photo crop to text | An OCR or vision model |
| Speech | voice to text, text to voice | Speech models, separate from the chat model |

Most everyday use is the first two rows. The hard rows are rarer, but they are where a weak model fails visibly: the wrong tie, the wrong person, an answer the notes don't support.

### Would small language models help?

**Yes, for part of the job, and not on their own.**

Small models (about 1–8 billion parameters) do well at:

- turning one sentence into one tool call when there are only a handful of tools to choose from, especially when their output is forced to match the tool's schema;
- classifying what the reader wants (words, characters and ties, highlights, a question);
- rephrasing a dictionary entry into a sentence worth speaking;
- running on cheap hardware: an 8B model fits one 24 GB GPU, and a 1–3B model can run inside the browser.

They fall short at:

- choosing among about 30 tools at once: accuracy drops as the tool list grows;
- multi-step plans: they stop early, repeat calls, or lose track of what an earlier call returned;
- ambiguity: they tend to guess instead of asking "which Mara?";
- questions: they are more likely to state things the book's notes don't say;
- producing valid tool calls every time, unless decoding is constrained.

So the design that makes small models useful has four parts:

1. **No model for fixed commands.** A rules parser in the gateway handles the most common commands ("add word X", "add character X", "show X") instantly and for free.
2. **Route by topic, then offer few tools.** Classify the request first, then give the model only that topic's 5–8 tools. A 30-way choice becomes a 6-way one.
3. **Constrain the output.** Serve the model with grammar-constrained decoding (vLLM's structured outputs, llama.cpp grammars), so every tool call matches its JSON Schema. Malformed calls become impossible, not just unlikely.
4. **Escalate what is hard.** Multi-step requests, questions, and anything the small model gets wrong twice go to a large model (Claude, or a large open model). The evaluation set decides where that line sits.

Fine-tuning a small model on Dog-Ear's own commands (a LoRA adapter trained on a few thousand examples) would raise its accuracy on the first two rows noticeably. The examples can be generated from the tool schemas and lists of phrasings, then checked by hand. Real conversations should be used only from readers who opt in.

### Candidate open models

| Part | Small: cheap and fast | Larger: better, needs more hardware | Notes |
|---|---|---|---|
| Assistant | Qwen3 4B or 8B, Llama 3.1 8B, Ministral 8B, Phi-4-mini | Qwen3 32B or 30B-A3B, Mistral Small 24B, Llama 3.3 70B | Choose on the evaluation set; tool-calling quality varies more than general benchmarks suggest |
| In the browser | Qwen3 0.6B–1.7B, Llama 3.2 1B or 3B, Gemma 3 1B, run with WebLLM or Transformers.js on WebGPU | — | A 0.5–2 GB download; intent and simple commands only |
| Reading a passage | Tesseract (in the browser), PaddleOCR or docTR (on a server) | Qwen2.5-VL 7B, Gemma 3 12B (both read images) | Classic OCR is strong on clean, flat crops; vision models cope better with curved, angled pages |
| Speech in | Whisper small or base (browser or server), Moonshine | Whisper large-v3 turbo (GPU) | Replaces Chrome's Google-backed recognition, and works in Firefox |
| Speech out | Piper, Kokoro (82M parameters) | — | Small enough for a CPU, and better than many built-in voices |
| Searching highlights | bge-small, gte-small or nomic-embed (embeddings) | — | Vectors stored with pgvector in Supabase |

### How to host them

| Option | What it is | Cost (approximate) | Good for | Watch out for |
|---|---|---|---|---|
| In the browser | WebLLM or Transformers.js run a 1–3B model on the reader's own GPU through WebGPU | Nothing to run | Privacy, offline use, simple commands | A 0.5–2 GB first download; WebGPU support varies by browser and phone; phones get warm; weak at questions |
| Hosted open-model API | Providers that serve open-weight models behind an OpenAI-compatible API, billed per token | About $0.05–0.20 per million tokens for 8B models, under $1 for 70B: often 20–100 times cheaper per token than frontier models | Open-model prices without running servers | Data still goes to a third party; check each provider's retention terms |
| Your own GPU server | vLLM (or SGLang, or llama.cpp's server) on one cloud GPU, reachable only by the gateway | A 24 GB GPU (NVIDIA L4 class) is about $0.70–0.90 an hour, or $550–650 a month if always on | Keeping data in your hands, steady heavy use, running Whisper and OCR on the same machine | You run it: updates, monitoring, security; you pay while it's idle; scaling to zero brings 10–60 second cold starts, which voice users will notice |
| CPU server | llama.cpp or Ollama with a 3–4B model, quantised, on a small cloud server | About $40–80 a month | Tiny budgets, simple commands | Slow: about 10–20 tokens a second, so several seconds per reply |

**Sizing rule of thumb.** Model weights take about 2 GB per billion parameters at 16-bit precision, or about 0.6 GB at 4-bit, plus room for the conversation. An 8B model at 16-bit fits a 24 GB GPU with space for several readers at once. A 32B model needs 4-bit to fit 24 GB, or a 48 GB GPU. A 70B model needs about 40 GB even at 4-bit.

**Break-even.** At roughly $0.04 per Claude request, an always-on $600-a-month GPU pays for itself at about 15,000 requests a month: some 25 readers making 20 requests a day. Dog-Ear is small and invite-only, so a per-token API (Claude, or a hosted open model) stays cheaper until usage grows a lot. Self-hosting is a privacy decision long before it is a cost decision.

### How it plugs into this design

The browser, the tools and the database stay exactly as designed above. Only the `assistant` gateway changes:

1. **One tool contract.** Tools are defined once, as JSON Schema. Adapters translate them for the Anthropic Messages API and for the OpenAI-compatible API that vLLM, llama.cpp, Ollama and hosted providers all speak.
2. **Adapters with one shape.** Every adapter streams the same events (text, tool call, finished, usage), so the browser's loop never knows which model answered.
3. **A router.** Rules parser first, then the small model, then a large model. The escalation rules live in configuration and are tuned against the evaluation set.
4. **A private model server.** A self-hosted vLLM server is reachable only from the gateway, over a private network or HTTPS with a shared secret, never from browsers.
5. **Our own loop, not Managed Agents.** Managed Agents runs Claude only. If open models are a real possibility, Option B (our own loop on the Messages API) keeps the swap cheap. This is the strongest argument in open question 1.

### Recommendation

1. **Camera reading (phase 2):** test Tesseract in the browser on 30 real page photos first. If it gets nearly every character right on cropped passages (say fewer than 2 in 100 wrong), use it: free, private and offline. Otherwise use a vision model.
2. **Assistant (phases 3–4):** build the model-neutral gateway with our own loop from the start, launch on Claude for the most reliable tool use, and build the evaluation set alongside it.
3. **After a month of use:** run the evaluation set against an 8B open model, with topic routing and constrained decoding, on a hosted provider. If it gets about 95 in 100 single commands right, route those to it and keep Claude for questions and multi-step requests. That cuts cost sharply with no server to run.
4. **Self-host** only if privacy demands it or usage passes the break-even point.
5. **Voice (phase 5):** start with the browser's own speech; move to Whisper and Piper or Kokoro if quality or Firefox support matters.
6. **Later experiment:** a 1–3B model in the browser for offline commands, which suits reading where there's no signal.

## What else an agent system like this needs

The model is one part. To design and run this properly I'd also need:

| Area | What it means here |
|---|---|
| **Tool contract** | One JSON Schema per tool, versioned in the repo. The browser validates every call before running it. Idempotency keys, so a retried call doesn't create the same character twice. |
| **Loop limits** | At most about 8 model steps per request, a time limit per step, a Stop button that cancels, failed tools returned to the model as errors rather than crashing, and parallel calls allowed. |
| **Confirmation policy** | Which actions run straight away (with Undo) and which ask first (removals with knock-on effects, more than five changes), plus an undo log that `undo_last_change` reads. |
| **Context management** | What goes into each request: the system prompt, the tools, the conversation, and only the book data that tools fetched. A cap on history, with older turns summarised, so a long chat doesn't grow cost forever. The book itself is the memory; no separate long-term memory is needed. |
| **Retrieval** | Postgres full-text search over highlights first; embeddings with pgvector for questions like "where does she talk about the river?", only if testing shows full-text isn't enough. |
| **Evaluation** | About 200 requests with their expected tool calls (scored by exact match), 20–30 multi-turn conversations, 30 or more page photos with checked text, and recorded spoken samples. Run on every change to prompts, tools or models, in CI. Answers to questions are checked by a stronger model against the book data. This turns a model choice into a measurement instead of an opinion. |
| **Observability** | A trace for every request: each model call and tool call, with latency and token counts. An open-source tracer (Langfuse, or OpenTelemetry into any backend), or plain rows in Postgres to start. Keep only what readers agreed to. |
| **Latency budget** | For voice to feel natural: speech to text under 1 second, the first words of the reply under 1.5 seconds, and speaking starting within half a second of the first sentence. Measured at the median and the 95th percentile. |
| **Cost controls** | Daily quotas per reader, a monthly cap with each provider, prompt caching, routing to smaller models, and an alert when spending jumps. |
| **Safety** | Tools limited to the open book, no tool that can send data anywhere, confirmation for destructive batches, quotes and OCR text treated as data rather than instructions, and refusals handled gracefully. |
| **Privacy** | A clear list of what each provider receives, consent before first use, sessions deleted, no chat logs by default, and a switch to turn AI features off. |
| **Fallbacks** | If a model or provider is down, the assistant says so and every manual screen works as today; camera reading falls back to typing; barcode lookup falls back to the New book form. |
| **Release process** | Feature flags per reader, the prompt, tool and model versions recorded with each trace, a new model compared on the evaluation set before it takes traffic, and a quick way back. |

## Alternatives considered

| Alternative | Why not |
|---|---|
| Call Claude from the browser with the API key | The key would be public; anyone could use it. |
| Let Claude write to the database directly (from the Edge Function, as the reader) | The screen would not update live, there'd be no Undo, and a second copy of every write path to keep in step with `useBookData`. |
| Commands without a model (fixed phrases like "add character Elara") | Brittle for natural speech; can't answer questions about the book. |
| On-device OCR (Tesseract.js) as the default | Weaker on curved, angled page photos; a large download. Kept as the fallback. |
| A custom camera view for page photos | The phone's camera app focuses and exposes better and needs no permission prompt. A live view is used only for barcodes, which need continuous scanning. |
| Cloud speech services | Better voices, but a second AI provider, more cost and more data leaving the device. Possible later. |

## Effort and phases

Each phase ships on its own; phases 1 and 2 don't depend on the assistant.

| Phase | What | Estimate |
|---|---|---|
| 1. Barcode books | `isbn` column, scanner, Open Library lookup, duplicate check, design system patterns | 2 days |
| 2. Camera highlights | `read-passage`, quota table, capture, crop, confirm, privacy notice | 2–3 days |
| 3. Assistant, reading | `assistant` function, agent or proxy, panel, streaming, read-only tools (words, characters, highlights), word follow-up, add-word tool | 4 days |
| 4. Assistant, changes | Every write tool, name resolution, activity rows, Undo, confirmation for large batches | 3–4 days |
| 5. Voice | Mic in the panel, spoken replies, settings | 1–2 days |
| Throughout | Design system additions, the evaluation set, README and privacy updates | 2–3 days |
| Model-neutral gateway | Adapters for the Anthropic and OpenAI-compatible APIs, a rules parser for fixed commands | 1–2 days |
| **Total** | | **About 3–3½ weeks** |
| Later, optional | Open 8B model behind the router (hosted), topic routing, constrained decoding, evaluation runs | 3–5 days |

## Rollout

1. Phase 1 needs no AI account: ship it first.
2. Before phase 2, create the Anthropic account, set a monthly spend limit, store the key with `supabase secrets set`, and add the AI privacy line.
3. Ship phases 2–5 with the features off by default; turn them on per reader.
4. After a week of use, compare `ai_usage` with the cost estimates and adjust quotas, effort or model.

## Open questions

1. **Managed Agents or the Messages API?** Hosted loop and history (beta, runtime billing, history kept until deleted) versus our own loop in the browser (generally available, nothing kept beyond standard retention). If open models might be used later, the Messages API with our own loop keeps that possible; Managed Agents runs Claude only.
2. **Model.** Claude Opus 5.5 at low effort by default. When the evaluation set exists, should an open 8B model take single commands behind the router?
3. **Page numbers from the photo.** Worth sending the whole page to read the printed page number, at about twice the cost per capture?
4. **Camera reading on device?** If sending the passage image to Anthropic is unwelcome, use Tesseract.js and accept weaker reading.
5. **Voice quality.** Are the browser's built-in voices good enough, or is a cloud voice worth a second provider?
6. **Quotas.** What daily limit per reader, and what monthly cap overall?
7. **Who can use AI features?** Everyone, or readers the admin turns it on for (like invites)?
8. **Is keeping data in-house a goal in itself?** If yes, self-hosted open models (and on-device OCR and speech) are worth their running cost; if not, per-token APIs stay cheaper at Dog-Ear's size.
9. **Training data.** Would readers opt in to sharing their commands, anonymised, to fine-tune a small model on Dog-Ear's own phrasing?
