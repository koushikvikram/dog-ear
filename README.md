# Dog-Ear

A reading helper for physical books. Per book you get a **Lexicon** (words with dictionary lookup), a **Character Graph** (an infinite canvas with your own kinds of ties) and **Highlights** (page, thought, optional quote, label, who is in it, with voice dictation).

It is an invite-only static site (React + Vite) on **GitHub Pages**, with **Supabase** as the whole backend: Postgres, Row Level Security, email magic-link sign-in, and one Edge Function for sending invites.

```
Browser (github.io)  ──supabase-js──▶  Supabase
  static React app                      ├─ Auth      (magic link, sign-ups disabled)
  public anon key                       ├─ Postgres  (tables + Row Level Security + RPC functions)
                                        └─ Edge Fn   invite-user (holds the secret key)
```

Contents: [1. What is in the box](#1-what-is-in-the-box) · [2. Supabase setup](#2-supabase-setup) · [3. Authentication and authorization](#3-authentication-and-authorization) · [4. GitHub Pages deployment](#4-github-pages-deployment) · [5. Local development](#5-local-development) · [6. Running it day to day](#6-running-it-day-to-day) · [7. Troubleshooting](#7-troubleshooting)

---

## 1. What is in the box

```
.github/workflows/deploy.yml     builds and publishes to GitHub Pages on every push to main
src/                             the React app (hash routing, so deep links work on Pages)
  pages/  Landing, Library, Book, Admin
  components/  Highlights, Characters (graph), Lexicon
  offline.js                     IndexedDB queue for highlights captured with no signal
supabase/
  migrations/                    the schema, in order: tables, RLS, functions
  setup.sql                      the same three files joined, for pasting into the SQL editor
  functions/invite-user/         Edge Function that approves invite requests
  config.toml                    auth settings used by the Supabase CLI
.env.example                     the two public values the app needs
```

The database design matches the "Dog-Ear: Data Model (Supabase)" document table for table.

---

## 2. Supabase setup

Do this first; GitHub Pages needs the project URL and key it produces. About 15 minutes.

### 2.1 Create the project

1. Sign in at [supabase.com](https://supabase.com), **New project**. Pick a region near you and save the database password somewhere safe (you will rarely need it).
2. When it is ready, open **Project Settings → API** and note two values:
   - **Project URL**, like `https://abcdxyz.supabase.co`
   - **Publishable / anon key** (labelled `anon` `public`)

   You will also see a `service_role` / secret key. **Never** put that one in the app, in GitHub, or in any file in this repo. Only Supabase's own Edge Function uses it, and Supabase injects it there for you.

### 2.2 Create the tables, security rules and functions

Pick one route.

**Route A: SQL editor (no tools needed).** Open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`, click **Run**. It must finish with "Success". If the last statement complains about `pg_cron`, go to **Database → Extensions**, enable **pg_cron**, and run just the last block (the `cron.schedule(...)` call) again.

**Route B: Supabase CLI (recommended if you will change the schema later).**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF     # the abcdxyz part of the URL
npx supabase db push                          # applies supabase/migrations/* in order
```

Check it worked: **Table Editor** should list `books`, `characters`, `ties`, `tie_types`, `words`, `highlights`, `highlight_labels`, `highlight_characters`, `dictionary`, `profiles`, `invite_requests`, each with a green "RLS enabled" badge. If any table shows RLS disabled, stop and fix that before going further.

### 2.3 Turn sign-ups off (this is what makes it invite-only)

**Authentication → Sign In / Providers** (older dashboards: **Authentication → Providers → Email** and **Settings**):

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

Magic links and invites only redirect to URLs on this list. A wrong or missing entry is the most common reason sign-in "does nothing". A project site lives under `/YOUR-REPO/`, so the path must be in the list. If you later add a custom domain, add that URL too.

### 2.5 Set up real email sending (do not skip)

Supabase's built-in email sender is for testing only: on a new project it is limited to a couple of emails per hour and it **only delivers to members of your Supabase organization**. Invitations to other people will silently not arrive.

Before inviting anyone: **Authentication → Emails → SMTP Settings → Enable custom SMTP**, and enter the details from any transactional provider (Resend, Postmark, Brevo, Amazon SES, Mailgun, your own domain's SMTP). Send yourself a test via a magic link. While you are there, the **Magic Link** and **Invite user** templates can be edited; keep `{{ .ConfirmationURL }}` in them.

### 2.6 Deploy the invite function

This is the only server-side code. It lets the Admin screen approve a request without ever exposing the secret key to the browser.

```bash
npx supabase functions deploy invite-user
npx supabase secrets set SITE_URL=https://YOUR-USER.github.io/YOUR-REPO/
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically. `SITE_URL` is the page the invite email sends people back to. Confirm in **Edge Functions** that `invite-user` is listed and **Verify JWT** is on.

(No CLI? **Edge Functions → Deploy a new function → Via editor**, name it `invite-user`, paste `supabase/functions/invite-user/index.ts`, deploy, then add `SITE_URL` under **Edge Functions → Secrets**.)

### 2.7 Create yourself and make yourself the admin

Nobody can sign up, so you create the first account from the dashboard:

1. **Authentication → Users → Add user → Send invitation** (or **Create new user**, tick **Auto Confirm User**). Use your own email.
2. Make that account an admin. In **SQL Editor** run (with your email):

   ```sql
   update profiles set is_admin = true
   where user_id = (select id from auth.users where email = 'you@example.com');
   ```

   Every account gets a `profiles` row automatically, with `is_admin` false. Nobody can change that flag from the app, only from the dashboard or SQL editor.
3. Check it: `select u.email, p.is_admin from profiles p join auth.users u on u.id = p.user_id;`

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
# create an empty repo on github.com (public is fine; the anon key is public by design), then:
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Do not commit `.env.local` (it is in `.gitignore`). The first push will start a workflow run that fails until you finish the next steps; that is expected.

### 4.2 Give the build its two public values

On GitHub: **Settings → Secrets and variables → Actions → Variables tab → New repository variable**. Add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL, e.g. `https://abcdxyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the anon / publishable key |

They are variables, not secrets, because they end up in the public JavaScript anyway. Vite bakes them in at build time, so changing them means re-running the workflow.

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
cp .env.example .env.local      # fill in your project's URL and anon key
npm install
npm run dev                      # http://localhost:5173/
npm run build                    # production build into dist/
```

`http://localhost:5173/` must be in the Supabase redirect list (section 2.4). To develop against a throwaway database instead of the hosted project, run `npx supabase start` (needs Docker) and use the local URL and anon key it prints; `supabase/config.toml` already turns sign-ups off there.

---

## 6. Running it day to day

- **Invites.** Account menu → **Invite requests** → **Approve** (sends the email) or **Decline** (sends nothing, with an Undo). A declined request can be moved back to pending.
- **Deleting a book** is soft: it disappears and shows an Undo for a few seconds, and a daily `pg_cron` job removes books deleted more than a day ago. Deleting a character, tie, highlight, word or label waits about six seconds before the request is sent, so Undo cancels it cleanly. If you close the tab inside that window the delete is simply not sent.
- **Offline capture.** Highlights saved with no signal are kept in the browser (IndexedDB) and sent when the connection returns; the chip beside the book title shows how many are waiting. Client-made ids make retries safe.
- **Your data.** Account menu → **Export my data** downloads everything you own as JSON.
- **Voice dictation** uses the browser's Web Speech API (Chrome, Edge, Safari). It needs microphone permission and, in Chrome, an internet connection. Firefox has no support; the mic button explains that.
- **Dictionary.** Definitions come from the free `dictionaryapi.dev` service and are cached in the shared `dictionary` table, so repeat lookups are instant and work offline.
- **Backups.** Supabase's free plan has no point-in-time backups. Use Export my data now and then, or `npx supabase db dump` from the CLI.
- **Free-plan note.** Supabase pauses free projects after a week without activity. Open the app weekly, or upgrade.
- **Removing someone.** **Authentication → Users → Delete**. Everything they own is deleted with them (`on delete cascade`).

---

## 7. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Page shows "Almost there" | The build has no `VITE_SUPABASE_*` values. Check the repository variables (4.2) and re-run the workflow. |
| Blank page, assets 404 | Pages source is not set to **GitHub Actions** (4.3), or you are opening `dist/index.html` from disk instead of a server. |
| "Check your email" but nothing arrives | Custom SMTP not set up (2.5), the address has no account yet (invite them first), or it is in spam. Check **Authentication → Logs**. |
| Magic link opens the site but you stay signed out | The URL is missing from the redirect allow-list, or the Site URL does not match (2.4). Use the same browser you requested the link in. |
| Approve says "Could not send the invite" | The function is not deployed, `SITE_URL` is not set, you are not `is_admin`, or SMTP is not configured. **Edge Functions → invite-user → Logs** shows which. |
| "Admins only" on your own account | `is_admin` is false for your row (2.7), or you signed in with a different email than the one you updated. |
| Everything loads empty after signing in | Migrations did not fully apply. Re-check section 2.2 and that every table shows RLS enabled with policies. |
| `new row violates row-level security policy` | Usually a stale session after reinstalling or switching projects. Sign out and in. |
| Voice button says it is blocked | Allow the microphone for the site in the browser's address bar settings. |
| Deleted book never purges | `pg_cron` is not enabled. Enable it under **Database → Extensions** and re-run the `cron.schedule` statement. |

---

Built with React, Vite and supabase-js. No analytics, no third-party scripts; the only outside call besides Supabase is the dictionary API.
