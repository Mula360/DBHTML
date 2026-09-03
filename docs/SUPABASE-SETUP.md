# Supabase setup — step by step

You only do this once. ~15 minutes. No CLI or Docker needed — everything is in
the Supabase dashboard plus one local `.env.local` file.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> and sign in (GitHub login is fine).
2. Click **New project**.
3. Fill in:
   - **Name:** `deccan-birders-ec`
   - **Database Password:** click *Generate a password*, then **copy it somewhere safe**
     (you rarely need it, but you can't see it again).
   - **Region:** `South Asia (Mumbai)` — closest to Hyderabad.
   - Plan: **Free** is fine.
4. Click **Create new project** and wait ~2 minutes for it to provision.

---

## 2. Run the database migrations

In the left sidebar: **SQL Editor** → **+ New query**.

Do these **three files in order**. For each: open the file from this repo, copy
the *entire* contents, paste into the editor, click **Run** (bottom right).
Wait for "Success. No rows returned" before the next one.

1. `supabase/migrations/0001_init.sql`  ← creates all the tables
2. `supabase/migrations/0002_rls.sql`   ← row-level security + helper functions
3. `supabase/migrations/0003_grants.sql` ← exposes the tables to the Data API
4. `supabase/seed.sql`                  ← term 2026-28, config, 10 members, portfolios

### API settings (Project Settings → API)

- **Enable Data API:** ON (required).
- **Automatically expose new tables:** OFF is fine — `0003_grants.sql` handles it.
- **Enable automatic RLS:** ON (safety net; our migration already enables RLS
  on every table).

> **Before running `seed.sql`:** if you have the real 10 EC members, edit the
> `names` and `emails` arrays near the top of the file first (keep the order:
> President, VP-1, VP-2, Secretary, Treasurer, EC1…EC5). Otherwise the
> placeholders `member1@example.com …` are fine and you can re-run an edited
> `seed.sql` later.

To confirm it worked: **Table Editor** in the sidebar → you should see ~30
tables, and `members` should have 10 rows.

---

## 3. Get the API keys

Left sidebar: **Project Settings** (gear icon) → **API**.

Copy these three values — you'll paste them into `.env.local` in step 5:

| Dashboard label | Goes into |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Project API keys → `anon` `public`** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project API keys → `service_role` `secret`** (click *Reveal*) | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key bypasses all security — treat it like a password, never
put it in client code or commit it.

---

## 4. Configure Auth (magic links)

Left sidebar: **Authentication**.

1. **Providers** → **Email**: make sure it is **enabled**. Turn **OFF**
   "Confirm email" is not required; leave "Enable Email OTP / magic link" **on**
   (it's on by default).
2. **URL Configuration:**
   - **Site URL:** `http://localhost:3000` (change to the real domain when you deploy)
   - **Redirect URLs:** add `http://localhost:3000/auth/callback`
     (and later `https://your-domain/auth/callback`)
3. Save.

> The app only lets an email sign in if it exists in the `members` table — the
> login form checks first, and the callback signs unknown emails straight back
> out. So seed the real members before sharing the link.

---

## 5. Point the app at Supabase

In the project folder:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=            # from step 3
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # from step 3
SUPABASE_SERVICE_ROLE_KEY=           # from step 3
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=                         # any random string, e.g. `openssl rand -hex 16`
RESEND_API_KEY=                      # leave blank for now — emails just log to the console
RESEND_FROM_EMAIL=ec@example.com
```

Leave `ANTHROPIC_API_KEY`, `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET` blank
(Phase 12).

---

## 6. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, enter one of the seeded member emails
(e.g. `member4@example.com` = Secretary). You'll get a magic-link email from
Supabase — click it, and you land on the dashboard.

- No email arriving? Check **Authentication → Logs** in the dashboard. On the
  free tier Supabase sends ~3–4 auth emails/hour from a shared address; for
  real use, add SMTP under **Project Settings → Auth → SMTP Settings** (or a
  Resend SMTP).
- "This app is for Deccan Birders EC members" → that email isn't in the
  `members` table.

---

## 7. Regenerate the TypeScript types (optional but recommended)

Once the schema is live, replace the hand-written types with generated ones:

```bash
npx supabase login                       # opens a browser
npx supabase link --project-ref <ref>    # <ref> is in your Project URL: https://<ref>.supabase.co
npm run db:types                         # writes lib/database.types.ts
```

Then commit the regenerated file. (Send me the Project URL and I'll do this and
reconcile anything that shifts.)

---

## 8. Later: deploying

- Create the same env vars on the host (Vercel / Railway).
- Set **Site URL** and add the `https://…/auth/callback` redirect URL in
  Supabase Auth.
- Apply future migrations with `npx supabase db push` (after `supabase link`),
  or paste new migration files into the SQL Editor.
- Cron: Vercel picks up `vercel.json` automatically once `CRON_SECRET` is set;
  on Railway add a scheduled job running `node scripts/trigger-cron.mjs`.
