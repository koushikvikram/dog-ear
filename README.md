# Dog-Ear

A reading helper for physical books. Per book you get a **Lexicon** (words with dictionary lookup), a **Character Graph** (an infinite canvas with your own kinds of ties) and **Highlights** (page, thought, optional quote, label, who is in it, with voice dictation).

It is an invite-only static site (React + Vite) on **GitHub Pages**, with **Supabase** as the whole backend: Postgres, Row Level Security, email magic-link sign-in, and one Edge Function for sending invites.

```
 Browser (github.io)                      Supabase
┌─────────────────────┐   supabase-js   ┌──────────────────────────────────────────┐
│ static React app    │ ──────────────▶ │ Auth       magic link, sign-ups disabled │
│ public publishable  │                 │ Postgres   tables, Row Level Security,   │
│ key only            │                 │            RPC functions                 │
└─────────────────────┘                 │ Edge Fn    invite-user (holds the        │
                                        │            secret key)                   │
                                        └──────────────────────────────────────────┘
```

## Contents

1. [What is in the box](#1-what-is-in-the-box)
2. [Supabase setup](#2-supabase-setup)
   1. [Create the project](#21-create-the-project)
   2. [Create the tables, security rules and functions](#22-create-the-tables-security-rules-and-functions)
   3. [Turn sign-ups off](#23-turn-sign-ups-off-this-is-what-makes-it-invite-only)
   4. [Tell Auth where the app lives](#24-tell-auth-where-the-app-lives)
   5. [Set up real email sending](#25-set-up-real-email-sending-do-not-skip)
   6. [Deploy the invite function](#26-deploy-the-invite-function)
   7. [Create yourself and make yourself the admin](#27-create-yourself-and-make-yourself-the-admin)
3. [Authentication and authorization](#3-authentication-and-authorization)
   1. [The model in one paragraph](#31-the-model-in-one-paragraph)
   2. [Roles](#32-roles)
   3. [Sign-in flows](#33-sign-in-flows)
   4. [Authorization rules (Row Level Security)](#34-authorization-rules-row-level-security)
   5. [Things you must not do](#35-things-you-must-not-do)
   6. [Test it yourself](#36-test-it-yourself-5-minutes)
4. [GitHub Pages deployment](#4-github-pages-deployment)
   1. [Put the code in a repository](#41-put-the-code-in-a-repository)
   2. [Give the build its two public values](#42-give-the-build-its-two-public-values)
   3. [Turn on Pages](#43-turn-on-pages)
   4. [Deploy](#44-deploy)
   5. [Connect the two halves](#45-connect-the-two-halves)
   6. [Custom domain (optional)](#46-custom-domain-optional)
   7. [Updating the app](#47-updating-the-app)
5. [Local development](#5-local-development)
6. [Running it day to day](#6-running-it-day-to-day)
7. [Troubleshooting](#7-troubleshooting)

### Setup checklist

Follow the sections in this order. Each step needs something from the one before it.

| Step | Where | Done when |
|---|---|---|
| 1 | Supabase project ([2.1](#21-create-the-project)) | You have the project URL and publishable key |
| 2 | Schema ([2.2](#22-create-the-tables-security-rules-and-functions)) | Every table shows RLS enabled |
| 3 | Sign-ups off, redirect URLs ([2.3](#23-turn-sign-ups-off-this-is-what-makes-it-invite-only), [2.4](#24-tell-auth-where-the-app-lives)) | Settings saved |
| 4 | Email ([2.5](#25-set-up-real-email-sending-do-not-skip)) | A test magic link arrives |
| 5 | Invite function ([2.6](#26-deploy-the-invite-function)) | `invite-user` is listed under Edge Functions |
| 6 | Your account ([2.7](#27-create-yourself-and-make-yourself-the-admin)) | The verify query shows `is_admin = true` |
| 7 | GitHub repo and Pages ([4](#4-github-pages-deployment)) | The workflow is green and the site loads |
| 8 | End-to-end check ([3.6](#36-test-it-yourself-5-minutes)) | A second account can sign in and cannot see your books |

---

## 1. What is in the box

```
.github/workflows/deploy.yml     builds and publishes to GitHub Pages on every push to main
docs/                            the design system (zip) and its interactive demo
src/                             the React app (hash routing, so deep links work on Pages)
  design-system/                 the vendored design system: tokens, components, types
  ui/                            app glue: platform switch, palettes, drawers/sheets, account menu
  app.css                        fits the design system's fixed artboards to a real viewport
  pages/  Landing, Library, Book (+ useBookData), Admin
  components/  Highlights, Characters (+ graph geometry), Lexicon
  offline.js                     IndexedDB queue for highlights captured with no signal
supabase/
  migrations/                    the schema, in order: tables, RLS, functions, design-system additions
  setup.sql                      the same files joined, for pasting into the SQL editor
  functions/invite-user/         Edge Function that approves invite requests
  config.toml                    auth settings used by the Supabase CLI
.env.example                     the two public values the app needs
```

The database design matches the "Dog-Ear: Data Model (Supabase)" document table for table.

**The interface** is built from the Dog-Ear design system in `docs/design_system.zip` (open `docs/design_system_demo.html` to try every screen). Its generated files are copied unchanged into `src/design-system/` and imported as ES modules; `src/design-system/README.md` says how to refresh them. The system has two platforms with no responsive CSS, so the app picks one at runtime: phone layouts below 768px wide, desktop layouts above. Fonts (Manrope, Source Serif 4) are bundled with the app, not loaded from Google.

---

## 2. Supabase setup

Do this first; GitHub Pages needs the project URL and key it produces. About 30 minutes, most of it email setup.

> Supabase moves things around in its dashboard from time to time. Where a menu path below does not match what you see, use the dashboard's search or the setting's name.

### 2.1 Create the project

1. Sign in at [supabase.com](https://supabase.com), **New project**. Pick a region near you and save the database password somewhere safe (you will rarely need it).
2. On the **Data access** options at creation, choose:
   - **Enable Data API: on.** The app talks to Postgres through it.
   - **Grant API access to new tables automatically: on.** The migrations contain no `GRANT` statements and rely on this. It is safe because Row Level Security is what gates access (see [3.4](#34-authorization-rules-row-level-security)). If you turned it off, see the grants fix in [section 7](#7-troubleshooting).
   - **Enable RLS on new tables automatically: on.** A safety net for tables you add later; the migrations already enable RLS on every table.
3. Skip the GitHub integration (Project Settings → Integrations). It is optional, and the steps below apply the schema directly.
4. When the project is ready, collect two values:
   - **Project URL**: open **Connect** (button at the top of the project) or **Integrations → Data API**. It must look exactly like `https://abcdxyz.supabase.co`, with **nothing after `.supabase.co`**. If the dashboard shows a URL ending in `/rest/v1` or a trailing slash, remove that part. The app adds the path itself, and a doubled path fails with error `PGRST125`.
   - **Publishable key**: **Settings → API Keys**, the key starting with `sb_publishable_`. It is the modern replacement for the old `anon` key and is just as safe to ship in the browser. (A legacy `anon` key also works.) The variable is still named `VITE_SUPABASE_ANON_KEY` for historical reasons.

   There is also a **Secret key** (the replacement for `service_role`). **Never** put it in the app, in GitHub, or in any file in this repo. Only the Edge Function uses it, and Supabase injects it there for you.

### 2.2 Create the tables, security rules and functions

Pick one route.

**Route A: SQL editor (no tools needed).** Open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`, click **Run**. It must finish with "Success". If the last statement complains about `pg_cron`, go to **Database → Extensions**, enable **pg_cron**, and run just the last block (the `cron.schedule(...)` call) again.

**Route B: Supabase CLI (recommended if you will change the schema later).**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF     # the abcdxyz part of the URL
npx supabase db push                                  # applies supabase/migrations/* in order
```

**Already set up before the design-system update?** Apply just `supabase/migrations/20261122000000_design_system.sql` (paste it into the SQL editor, or `npx supabase db push`). It lets new books store a cover colour, gives your existing books one, and indexes the dictionary for suggestions as you type.

**Already set up before two-way ties and note cards?** Apply `supabase/migrations/20261126000000_two_way_ties_note_cards.sql` the same way. It lets a tie point both ways and turns each character's notes into a list of cards (an existing note becomes the first card).

Check it worked: **Table Editor** should list `books`, `characters`, `ties`, `tie_types`, `words`, `highlights`, `highlight_labels`, `highlight_characters`, `dictionary`, `profiles`, `invite_requests`, each with an "RLS enabled" badge. If any table shows RLS disabled, stop and fix that before going further.

### 2.3 Turn sign-ups off (this is what makes it invite-only)

**Authentication → Sign In / Providers** (older dashboards: **Providers → Email** and **Settings**):

- **Allow new users to sign up**: **off**.
- **Email** provider: **on**. **Confirm email**: on.
- Leave Google, GitHub and the rest off for now.

With sign-ups off, only an admin invite can create an account, and the app also calls sign-in with `shouldCreateUser: false` as a second lock.

### 2.4 Tell Auth where the app lives

**Authentication → URL Configuration**:

- **Site URL**: `https://YOUR-USER.github.io/YOUR-REPO/` (keep the trailing slash)
- **Redirect URLs** (add all of these):
  - `https://YOUR-USER.github.io/YOUR-REPO/`
  - `http://localhost:5173/` (local development)

Magic links and invites only redirect to URLs on this list. A wrong or missing entry is the most common reason sign-in "does nothing". A project site lives under `/YOUR-REPO/`, so the path must be in the list. If you later add a custom domain, add that URL too. Also set the same Site URL in `supabase/config.toml` if you use the CLI to push auth settings or run Supabase locally.

### 2.5 Set up real email sending (do not skip)

Supabase's built-in email sender is for testing only: it is limited to a couple of emails per hour and it **only delivers to members of your Supabase organization**. Invitations to other people silently do not arrive. Before inviting anyone, enable custom SMTP: **Authentication → Emails → SMTP Settings → Enable custom SMTP** (on some dashboards: **Project Settings → Authentication → SMTP Settings**). Pick one provider below.

**Option A: Gmail, free, no domain needed (good for a small invite-only app).**

1. Use a Google account with 2-Step Verification turned on. A dedicated address such as `dogear.notes@gmail.com` keeps your personal address out of every email.
2. Create an app password at <https://myaccount.google.com/apppasswords> (name it "Dog-Ear") and copy the 16-character code. If the page does not exist for your account, 2-Step Verification is off or the account is managed by an organization.
3. Enter in Supabase:

   | Field | Value |
   |---|---|
   | Host | `smtp.gmail.com` |
   | Port | `587` (if it fails, try `465`) |
   | Username | the full Gmail address |
   | Password | the app password (not your normal password) |
   | Sender email | the same Gmail address |
   | Sender name | Dog-Ear |

   Emails come from a Gmail address rather than a branded one. Because Google's own servers send them they usually deliver well, but tell invitees to check spam. Gmail allows a few hundred messages a day, far more than you need.

**Option B: Resend (branded sender, needs a domain you own).** Resend only sends to other people from a verified domain. Add a subdomain such as `mail.yourdomain.com` under **Domains**, add the DNS records it shows, verify, then create an API key. In Supabase use host `smtp.resend.com`, port `465`, username `resend`, password = the API key, and a sender like `noreply@mail.yourdomain.com` (it must be on the verified subdomain). Resend also offers a one-click **Connect to Supabase** under its **Settings → Integrations**.

After saving, check **Authentication → Rate Limits** and make sure the emails-per-hour limit suits you: invites and magic links both count.

**Edit the email templates** at **Authentication → Emails → Templates** (editable once custom SMTP is on). Keep `{{ .ConfirmationURL }}` in the body. You only need **Magic Link** and **Invite user**; the others are never sent because sign-ups are off and there are no passwords.

*Magic Link*, subject `Your Dog-Ear sign-in link`:

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#18181B">
  <h2 style="margin:0 0 12px;font-family:Georgia,serif">Dog-Ear</h2>
  <p>Tap the button to sign in. The link works once and expires soon.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#7DD3A8;color:#0B1F16;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Sign in to Dog-Ear</a>
  </p>
  <p style="color:#71717A;font-size:13px">If the button doesn't work, paste this into your browser:<br>{{ .ConfirmationURL }}</p>
  <p style="color:#71717A;font-size:13px">Didn't ask for this? You can ignore the email.</p>
</div>
```

*Invite user*, subject `You're invited to Dog-Ear`:

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#18181B">
  <h2 style="margin:0 0 12px;font-family:Georgia,serif">Dog-Ear</h2>
  <p>Your request was approved. Dog-Ear is a quiet place for notes on the books you hold in your hands.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#7DD3A8;color:#0B1F16;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Accept the invite</a>
  </p>
  <p style="color:#71717A;font-size:13px">If the button doesn't work, paste this into your browser:<br>{{ .ConfirmationURL }}</p>
  <p style="color:#71717A;font-size:13px">After this first visit, sign in any time by choosing "I have an invite" and entering this email address. We'll send a fresh link.</p>
</div>
```

### 2.6 Deploy the invite function

This is the only server-side code. It lets the Admin screen approve a request without ever exposing the secret key to the browser.

```bash
npx supabase login                                   # skip if already done
npx supabase link --project-ref YOUR-PROJECT-REF     # skip if already done
npx supabase functions deploy invite-user
npx supabase secrets set SITE_URL=https://YOUR-USER.github.io/YOUR-REPO/
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically (Supabase says it will retire the legacy key names by the end of 2026 in favor of the publishable and secret keys; if approvals start failing with a missing-key error after that, the function's three `Deno.env.get(...)` lines are the place to update). `SITE_URL` is the page the invite email sends people back to. Confirm in **Edge Functions** that `invite-user` is listed and **Verify JWT** is on.

(No CLI? **Edge Functions → Deploy a new function → Via editor**, name it `invite-user`, paste `supabase/functions/invite-user/index.ts`, deploy, then add `SITE_URL` under **Edge Functions → Secrets**.)

### 2.7 Create yourself and make yourself the admin

Nobody can sign up, so a new project has **no users** until you add one from the dashboard:

1. **Authentication → Users → Add user → Create new user.** Enter your email and any strong password (the app never asks for it; sign-in is by emailed link only) and tick **Auto Confirm User**. ("Send invitation" also works and tests SMTP at the same time.)
2. Copy your user id: in the **SQL Editor** run `select id, email from auth.users;`.
3. Make that account an admin. Every account normally gets a `profiles` row automatically, and this statement creates it if it is missing:

   ```sql
   insert into profiles (user_id, is_admin)
   values ('PASTE-YOUR-USER-ID-HERE', true)
   on conflict (user_id) do update set is_admin = true
   returning *;
   ```

   Nobody can change the admin flag from the app, only from the dashboard or SQL editor. (The `profiles` table has no email column, which is expected: emails live in `auth.users`. Using the id avoids typo and hidden-character mismatches.)
4. Verify: `select u.email, p.is_admin from profiles p join auth.users u on u.id = p.user_id;` The SQL editor often says "No rows returned" after an insert or update even when it worked, so trust this query, not that message.

To test email without the app, use **Authentication → Users → ⋯ on your user → Send magic link**. If nothing arrives, check **Authentication → Logs**.

---

## 3. Authentication and authorization

### 3.1 The model in one paragraph

Anyone on the internet can load the site and read the anon key from its JavaScript, so **the key is not a secret and the app code is not a security boundary**. All protection is in Postgres: Row Level Security (RLS) is on for every table, and a request is allowed only if its JWT (the signed-in user's token) satisfies a policy. Authentication answers "who is this?" (Supabase Auth, magic link). Authorization answers "what may they touch?" (RLS policies plus one `is_admin` flag).

### 3.2 Roles

| Who | How Supabase sees them | What they can do |
|---|---|---|
| Visitor | `anon` role | Insert one row into `invite_requests` (status forced to `pending`). Cannot read anything, including that table. |
| Member | `authenticated`, JWT `sub` = their user id | Full read/write on **their own** books and everything under them. Read the shared `dictionary`. Read their own `profiles` row. Call the RPC functions. |
| Admin | a member whose `profiles.is_admin` is true | Everything a member can, plus read and update `invite_requests`, plus approve through the Edge Function. |
| Edge Function | `service_role`, only inside Supabase | Sends invites after re-checking that the caller is an admin. |

### 3.3 Sign-in flows

**Requesting an invite.** The welcome page inserts `{ email, note }` into `invite_requests` using the anon key. A unique index on `lower(email)` blocks duplicates; the app treats a duplicate as success so the form never reveals who has already asked. A hidden honeypot field catches simple bots.

**Approving.** Admin opens **Invite requests** and clicks **Approve**. The browser calls the `invite-user` Edge Function with the admin's token. The function (1) verifies the token, (2) looks up `profiles.is_admin` with the service key, (3) calls `auth.admin.inviteUserByEmail`, (4) marks the request `approved`. Declining or reopening is a plain table update allowed by the admin policy, and sends nothing. You can also approve manually from the dashboard (**Authentication → Users → Invite user**).

**Signing in.** The invitee opens the invite email and lands on the app signed in. Afterwards they use **I have an invite**: the app calls `signInWithOtp({ email, options: { shouldCreateUser: false } })` and shows the same "check your email" message whether or not the address is invited, so the form cannot be used to discover who has an account. The link uses the PKCE flow (`?code=` in the URL), which the client exchanges for a session in the browser; the app then removes the code from the address bar. Invite links use Supabase's implicit flow (`#access_token=` in the URL); the app also handles those, and strips them so they do not collide with its hash routing.

**Sessions.** supabase-js keeps the session in `localStorage` and refreshes the token automatically. Sign out from the account menu. To force every device to sign out, use **Authentication → Users → ⋯ → Sign out**.

### 3.4 Authorization rules (Row Level Security)

- `books`: one policy, `user_id = auth.uid()` for all operations. `user_id` defaults to `auth.uid()`, so the client never supplies it and cannot forge it.
- Every child table (`tie_types`, `characters`, `ties`, `words`, `highlights`, `highlight_labels`) carries `book_id` and uses `owns_book(book_id)`. `highlight_characters` checks ownership through its highlight.
- A trigger rejects a tie whose two characters are not in the tie's own book (RLS alone cannot see that).
- `dictionary`: read-only for members. Writes only through `cache_definition()`, a `security definer` function that skips existing words and rejects oversized entries.
- `profiles`: members can read their own row. There is no insert or update policy, so nobody can promote themselves.
- `invite_requests`: anon insert only; admin select and update via `is_admin()`.
- The RPC functions (`library_books`, `create_book`, `export_my_data`) are `security invoker`, so they run with the caller's rights and RLS still applies. Only `is_admin()`, `handle_new_user()`, `seed_labels()` and `cache_definition()` are `security definer`, each with a pinned `search_path`.

### 3.5 Things you must not do

- Do not put the `service_role` key in the repo, in `.env`, in a GitHub variable or in client code.
- Do not disable RLS on any table, even briefly. Without a policy a table returns nothing; with RLS off it returns everything to everyone.
- Do not turn **Allow new users to sign up** back on.
- Do not add a `for all to anon` policy to anything.

### 3.6 Test it yourself (5 minutes)

1. Sign in as two different users (invite a second email, or use a private window).
2. As user A, create a book. As user B, confirm the library is empty.
3. In the SQL editor, impersonate a user to check policies directly:

   ```sql
   set local role authenticated;
   set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';  -- any other user's id
   select count(*) from books;   -- expect 0
   ```
4. Signed out, open the app: you should see only the welcome page, and a request to `…/rest/v1/books` with just the anon key should return `[]`.
5. As a non-admin, open `#/admin`: you should see "Admins only".

---

## 4. GitHub Pages deployment

### 4.1 Put the code in a repository

```bash
cd dog-ear
git init -b main
git add .
git commit -m "Dog-Ear"
# create an empty repo on github.com (public is fine; the publishable key is public by design), then:
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Do not commit `.env.local` (it is in `.gitignore`). The first push will start a workflow run that fails or builds a non-working site until you finish the next steps; that is expected.

### 4.2 Give the build its two public values

On GitHub: **Settings → Secrets and variables → Actions → Variables tab → New repository variable**. Add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL, e.g. `https://abcdxyz.supabase.co` (nothing after `.supabase.co`: no `/rest/v1`, no trailing slash) |
| `VITE_SUPABASE_ANON_KEY` | the publishable key (`sb_publishable_…`) or legacy anon key |

They are variables, not secrets, because they end up in the public JavaScript anyway. Vite bakes them in at build time, so **changing a variable means re-running the workflow** (Actions → Deploy to GitHub Pages → Run workflow) and hard-refreshing the site.

### 4.3 Turn on Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.** Nothing else to choose.

### 4.4 Deploy

Push to `main`, or **Actions → Deploy to GitHub Pages → Run workflow**. When it goes green, the deploy job prints the URL: `https://YOUR-USER.github.io/YOUR-REPO/`. Open it; you should see the welcome page.

The build uses relative asset paths (`base: './'`) and hash routing (`#/book/…`), so the same build works under `/YOUR-REPO/`, on a custom domain, or at a user site root, and deep links never 404.

### 4.5 Connect the two halves

If you have not already, make sure the exact Pages URL is in Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs) and in the Edge Function secret `SITE_URL` (section 2.4 and 2.6). Then sign in with the account you created in 2.7.

### 4.6 Custom domain (optional)

Add the domain under **Settings → Pages → Custom domain**, create the DNS record GitHub shows, tick **Enforce HTTPS**, then add the new URL to the Supabase redirect list, update the Site URL, and re-run `supabase secrets set SITE_URL=…`.

### 4.7 Updating the app

Push to `main`. The workflow rebuilds and republishes in about a minute. Schema changes go in a new file in `supabase/migrations/` (name it with a later timestamp), applied with `npx supabase db push`.

---

## 5. Local development

```bash
cp .env.example .env.local      # fill in your project's URL and publishable key
npm install
npm run dev                      # http://localhost:5173/
npm run build                    # production build into dist/
```

`http://localhost:5173/` must be in the Supabase redirect list (section 2.4). To develop against a throwaway database instead of the hosted project, run `npx supabase start` (needs Docker) and use the local URL and anon key it prints; `supabase/config.toml` already turns sign-ups off there.

---

## 6. Running it day to day

- **Invites.** Account menu → **Invite requests** (on a computer; on a phone, open `#/admin`) → **Approve** (sends the email) or **Decline** (sends nothing, with an Undo). A declined request can be moved back to pending. Requests stay **pending** until you act: the app does not notify you of new ones, so check the screen now and then. Approving an address that already has an account says so instead of sending a second invite.
- **Deleting a book** is soft: it disappears and shows an Undo for a few seconds, and a daily `pg_cron` job removes books deleted more than a day ago. Deleting a character, tie, highlight, word or label waits about six seconds before the request is sent, so Undo cancels it cleanly. If you close the tab inside that window the delete is simply not sent.
- **Offline capture.** Highlights saved with no signal are kept in the browser (IndexedDB) and sent when the connection returns; the chip beside the book title shows how many are waiting. Client-made ids make retries safe.
- **Your data.** Account menu → **Export my data** downloads everything you own as JSON.
- **Voice dictation** uses the browser's Web Speech API (Chrome, Edge, Safari). It needs microphone permission and, in Chrome, an internet connection. Firefox has no support; the mic button explains that.
- **Dictionary.** Definitions come from the free `dictionaryapi.dev` service and are cached in the shared `dictionary` table, so repeat lookups are instant and work offline. Suggestions as you type come from the free [Datamuse API](https://www.datamuse.com/api/) (words by prefix, most common first, with part of speech and pronunciation), merged with that cache; offline, only cached words are suggested. A word neither service knows can still be added.
- **Backups.** Supabase's free plan has no point-in-time backups. Use Export my data now and then, or `npx supabase db dump` from the CLI.
- **Free-plan note.** Supabase pauses free projects after a week without activity. Open the app weekly, or upgrade.
- **Removing someone.** **Authentication → Users → Delete**. Everything they own is deleted with them (`on delete cascade`).

---

## 7. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Page shows "Almost there" | The build has no `VITE_SUPABASE_*` values. Check the repository variables (4.2) and re-run the workflow. |
| Blank page, assets 404 | Pages source is not set to **GitHub Actions** (4.3), or you are opening `dist/index.html` from disk instead of a server. |
| Request form says "Something went wrong" | Open browser DevTools → **Network**, resubmit, click the failed `invite_requests` request and read the response. See the three rows below. |
| Response `PGRST125` "Invalid path specified in request URL" (404) | `VITE_SUPABASE_URL` has extra path or a trailing slash. Set it to exactly `https://YOUR-REF.supabase.co`, re-run the workflow, hard-refresh. |
| Response `42501` / "permission denied" | The Data API's automatic grants were off. Run the grants below. |
| Response 401 / "Invalid API key" | `VITE_SUPABASE_ANON_KEY` is wrong. Use the **publishable** key from Settings → API Keys, re-run the workflow. |
| A request stays **pending** for ages | Normal: it waits for you. Approve it on the Admin screen (account menu → Invite requests). |
| "Check your email" but nothing arrives | Custom SMTP not set up (2.5), the address has no account yet (invite them first, or create it in 2.7), or it is in spam. Check **Authentication → Logs**. |
| Magic link opens the site but you stay signed out | The URL is missing from the redirect allow-list, or the Site URL does not match (2.4). Use the same browser you requested the link in. |
| Approve says "Could not send the invite" | The function is not deployed, `SITE_URL` is not set, you are not `is_admin`, or SMTP is not configured. **Edge Functions → invite-user → Logs** shows which. |
| Approve says the address already has an account | They are already a user. They can sign in with **I have an invite**. |
| "Admins only" on your own account | `is_admin` is false for your row (2.7), or you signed in with a different email than the one you updated. |
| SQL editor says "No rows returned" after the admin statement | Normal for inserts and updates; verify with the `select` in 2.7. |
| Everything loads empty after signing in | Migrations did not fully apply. Re-check section 2.2 and that every table shows RLS enabled with policies. |
| `new row violates row-level security policy` | Usually a stale session after switching projects. Sign out and in. |
| Voice button says it is blocked | Allow the microphone for the site in the browser's address bar settings. |
| Deleted book never purges | `pg_cron` is not enabled. Enable it under **Database → Extensions** and re-run the `cron.schedule` statement. |

**Grants fix** (only needed if "Grant API access to new tables automatically" was off). Safe, because Row Level Security still decides what each role can actually do:

```sql
grant usage on schema public to anon, authenticated;
grant insert on invite_requests to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
```

---

Built with React, Vite and supabase-js. No analytics, no third-party scripts; the only outside calls besides Supabase are the two word services in the Lexicon: dictionaryapi.dev for definitions and the Datamuse API for suggestions as you type (both see only the words typed there). Word suggestions are powered by the [Datamuse API](https://www.datamuse.com/api/).
