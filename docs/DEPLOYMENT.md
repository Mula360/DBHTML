# EC Portal — deployment & operations

Companion to `SUPABASE-SETUP.md`. A rendered version of this guide is published
as a Claude artifact (ask the maintainer for the link).

---

## Bottom line

- **Core portal:** $0/month — fits the free tiers of Supabase, Vercel and Resend.
- **Meeting bot (Phase 12, optional):** ~$1 per meeting (~$20/year all-in),
  covered in year one by free trial credits.
- **Time to deploy:** ~90 minutes, mostly DNS + Supabase auth config.

## Accounts

| Service | Role | Tier | Cost |
|---|---|---|---|
| GitHub | code (`Mula360/DBHTML`) | Free | $0 |
| Supabase | Postgres + magic-link auth + RLS | Free (500 MB / 50k MAU) | $0 · Pro $25/mo if outgrown |
| Vercel | Next.js host + daily cron | Hobby or Pro | $0 · Pro $20/mo |
| Resend | digests, reminders, login-link SMTP | Free (3k/mo, 100/day) | $0 |
| Anthropic | Claude — drafts minutes from transcript | Pay-as-you-go | $5 min top-up ($5 trial credit) |
| Recall.ai | bot joins Google Meet, records + transcribes | Pay-as-you-go | $0.65/hr, first 5 hrs free |
| Domain | nice URL + verified email sender | any registrar | ~$12/yr |

Already done: Supabase project `wmpuxjlfqujvfsehqjnt` created, migrated
(`0001`–`0004`), seeded with 10 placeholder members.

---

## Deploy the app

### 1. Finalise the database
- Edit the `names` / `emails` arrays in `supabase/seed.sql` with the real 10
  members (order: President, VP-1, VP-2, Secretary, Treasurer, EC1–EC5), run it
  in the Supabase SQL Editor.
- **Only emails in `members` can log in** — seed real people before sharing the link.

### 2. Resend (email)
Two email paths:
- **App email** (digests/reminders) → app calls the Resend API directly; needs
  `RESEND_API_KEY` + a verified sender.
- **Login links** → sent by Supabase auth; rate-limited to ~4/hr unless you give
  it your own SMTP.

Steps:
1. Resend → create account → **add your domain** → paste the DNS records (SPF,
   DKIM, return-path CNAME) at your registrar → wait for verification.
2. Create an **API key**; set `RESEND_FROM_EMAIL` to an address on that domain.
3. Supabase → **Project Settings → Auth → SMTP Settings** → enable custom SMTP:
   ```
   Host:     smtp.resend.com
   Port:     465
   Username: resend
   Password: <Resend API key>
   Sender:   ec@yourdomain.org
   ```

No domain yet? Launch on `onboarding@resend.dev` + Supabase's built-in email for
a small pilot; add the domain before rolling out to everyone.

### 3. Deploy to Vercel
1. vercel.com → **Add New → Project → Import** `Mula360/DBHTML` (auto-detects Next.js).
2. **Environment Variables** (Production + Preview):
   ```
   SUPABASE_URL       = https://wmpuxjlfqujvfsehqjnt.supabase.co
   SUPABASE_ANON_KEY  = <anon key — Supabase → Settings → API>
   SUPABASE_SERVICE_ROLE_KEY      = <service_role key — same page>
   APP_URL            = https://<your>.vercel.app
   CRON_SECRET                    = <openssl rand -hex 24>
   RESEND_API_KEY                 = <from step 2>
   RESEND_FROM_EMAIL             = ec@yourdomain.org
   ```
3. **Deploy.** `vercel.json` declares the cron (`30 2 * * *` = 08:00 IST); Vercel
   picks it up and sends `Authorization: Bearer <CRON_SECRET>` automatically.

Plan note: Hobby cron runs once/day (delayed up to 1 hr) — fine for this. Use
Pro ($20/mo) for exact timing or if a society tool counts as commercial under
Vercel's ToS. Function timeout is 60s on both; the job finishes in seconds.

### 4. Point Supabase auth at the live URL
Supabase → **Authentication → URL Configuration**:
- Site URL → `https://<your>.vercel.app`
- Redirect URLs → add `https://<your>.vercel.app/auth/callback`

Redeploy Vercel after any `APP_URL` change.

### 5. Custom domain (optional)
Vercel → Settings → Domains → add `ec.yourdomain.org`, follow the CNAME steps,
update `APP_URL` + the two Supabase URLs, redeploy.

### 6. Smoke test
- Open the URL → bounced to `/login`.
- Seeded member email → magic link → dashboard with position badge.
- Non-member email → "This app is for Deccan Birders EC members."
- `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your>.vercel.app/api/cron/daily`
  → `{"ok":true, ... "errors":{}}`.

### Diagnosing a broken deployment

If login rejects a valid member with "This app is for Deccan Birders EC
members", the deployment can't reach the database. Open:

```
https://<your-app>.vercel.app/api/health
```

It reports (no secrets, no member data):

- `supabaseUrl` / `projectRef` — which project the deployment is pointed at
- `serviceKey.role` — should be `service_role`, **not** `anon`
- `refsMatch` — whether the URL, anon key and service key are all the same project
- `membersVisible` — should be `10`; `null` with a `dbError` means the
  service-role key is wrong or lacks grants

Fix the offending env var, then **redeploy** (env changes don't apply to an
existing build).

### Test / demo accounts (password login)

The login page has a "Have a test password?" link for email + password sign-in.
It only works for accounts that have a password set — regular members use magic
links only. The seeded test accounts:

| Email | Password | Role |
|---|---|---|
| `member1@example.com` | `DeccanAdmin2026` | President — officer / admin powers |
| `member10@example.com` | `DeccanMember2026` | EC5 — plain member |
| `srikanth@deccanbirders.org` | `DeccanSec2026` | Secretary — officer / admin powers |

Change or remove these before going live (Supabase → Authentication → Users, or
`node scripts/set-demo-passwords.mjs` — see the script header).

### Railway alternative
Deploy the repo as a web service with the same env vars, then add a **Cron**
service (`30 2 * * *`, start command `node scripts/trigger-cron.mjs`, with
`APP_URL` + `CRON_SECRET`).

---

## The AI pipeline (Phase 12, optional)

Flow: Secretary adds the Meet link + clicks *Activate bot* → Recall.ai bot
records & transcribes → `/api/recall-webhook` stores the transcript → Claude
drafts decisions / action items / attendance → a **Draft MoM** is pre-filled for
the Secretary to edit and approve. **Nothing is emailed automatically.**

### Anthropic
1. console.anthropic.com → sign up (phone verify; $5 free trial credit).
2. Billing → optionally add a card, top up (min $5). Leave **auto-reload off**.
3. API Keys → Create Key.
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ANTHROPIC_MODEL   = claude-sonnet-4-6   # optional, this is the default
   ```

Cost: Sonnet 4.6 is $3/$15 per million in/out tokens. A 1.5 hr transcript ≈
20k input + 1.5k output ≈ **$0.08/meeting** ≈ $0.80/year. Trial credit lasts years.

### Recall.ai
1. recall.ai → sign up → Pay-as-you-go plan → create API key (first 5 hrs free).
2. Add a webhook:
   ```
   URL:    https://<your>.vercel.app/api/recall-webhook
   Events: transcript.done + bot status events
   ```
3. Set a shared secret in **both** Recall's webhook config and Vercel:
   ```
   RECALL_API_KEY        = <from Recall>
   RECALL_WEBHOOK_SECRET = <random string, identical on both sides>
   ```
4. Redeploy Vercel.

Cost: $0.50/hr recording + $0.15/hr transcription = **$0.65/hr**, to the second,
no monthly fee. ~15 hrs/year ≈ **$10/year** (less the 5 free hours in year one).
Storage free for 7 days (enough for the webhook to pull the transcript).

### Test
Create a meeting with a real Meet link → *Activate meeting bot* → start the call
yourself → the bot joins in ~1 min → speak some test decisions/action items →
end the call → within minutes the chip flips to "Transcript received" and the
Minutes section is pre-filled.

### Turn it off
Remove the `ANTHROPIC_*` / `RECALL_*` vars. The code stays in the build but goes
inert; minutes are then written by hand in the same editor.

---

## Cost summary

| Item | When | ~Annual |
|---|---|---|
| Supabase / Vercel / Resend free tiers | always | $0 |
| Domain | optional | ~$12 |
| Anthropic | bot on | ~$1 (yr 1 free via credit) |
| Recall.ai | bot on | ~$7–12 |
| Vercel Pro | only if needed | $240 |

Minimum viable **$0/year**; with the bot + a domain **~$20/year**.

---

## What else is needed (not code)

- Real member names/emails + positions for the 2026–28 term.
- Confirm the baseline rules in Settings (4 minimums, 180-day Pitta window,
  Sept–Aug year, ⅓ quorum, apology/virtual flags) against the bye-laws & R&R doc.
- Confirm the 11 portfolio assignments (seed uses a plausible guess).
- The membership register as a CSV for the import wizard.
- Decide who holds the President/Secretary admin role.
- If using the bot: standardise on Google Meet; agree the Secretary announces
  recording at the start of each call.
- Tell members their data lives in the tool; the register is visible to register
  managers.
- Backups: manual `pg_dump` before big changes on Free; Pro for 7-day PITR.

---

See `FUNCTIONAL-GUIDE.md` for a module-by-module description of what the portal
does and who can do what.
