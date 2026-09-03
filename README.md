# Deccan Birders EC Portal

Private internal tool for the 10-member Executive Committee of Deccan Birders
(a birding society in Hyderabad). Meetings & minutes, action-item tracking with
automated reminders, a dynamic compliance / "baseline obligations" tracker,
field walks, annual events (incl. AGM statutory calculator), the Pitta
newsletter, 11 portfolio pages, a ~570-member general register, expense claims,
documents, and reports.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Resend ·
host-agnostic daily cron. Phase 2 adds a Recall.ai meeting bot + Claude MoM
extraction.

The earlier single-file design prototype lives in [`prototype/`](./prototype)
for visual reference — it is not wired into the app.

---

## Build status

Phases 0–2 are in: scaffold, schema + auth + RLS + seed + shell, and the full
Action Items module with the daily cron dispatcher (action-item reminders,
walk-tomorrow reminders, society-member status recompute, statutory reminders,
Monday + 1st-of-month digests). Modules 3–12 are scaffolded routes behind the
sidebar and ship in later phases — see the phase table below.

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Scaffold, lib helpers, CI-ready build | ✅ |
| 1 | Schema + RLS + magic-link auth + seed + shell/dashboard | ✅ |
| 2 | Action Items (list/filter/create/detail/comments/status) + full cron dispatcher | ✅ |
| 3 | Meetings + MoM + quorum | stub route |
| 4 | Compliance tracker | calculators in `lib/compliance.ts`, stub UI |
| 5–11 | Walks, Events, Pitta, Portfolios, Membership, Reports, Docs+Claims | stub routes |
| 12 | Meeting bot + AI | not started |

## Local development

Requires Node 20+ and (for a real database) Docker + the Supabase CLI.

```bash
npm install
cp .env.example .env.local        # fill in the Supabase + CRON values

# with Docker:
npx supabase start                # spins up local Postgres + Auth + Studio
npm run db:reset                  # applies migrations + supabase/seed.sql
npm run db:types                  # regenerate lib/database.types.ts from the live schema

npm run dev                       # http://localhost:3000
```

Without Docker you can still `npm run build`, `npm run typecheck`, and
`npm test` — the app just has no database to talk to.

### Editing the seed

`supabase/seed.sql` seeds term **2026-28**, the default `compliance_config`,
10 placeholder members with positions, and 11 portfolio assignments. Replace the
`names` / `emails` arrays with the real EC before going live. For a hosted
project, edit `scripts/seed-data.json` and run `npm run seed` with
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set.

## Creating the hosted Supabase project

1. Create a project at supabase.com. Note the project ref.
2. `npx supabase link --project-ref <ref>`
3. `npx supabase db push` — applies `supabase/migrations/*` to the hosted DB.
4. `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`
5. In Supabase Auth settings: enable Email provider, disable "Confirm email"
   is not needed (magic links only), set the Site URL and redirect URL to
   `<NEXT_PUBLIC_APP_URL>/auth/callback`.
6. Fill `.env` on the host with the URL, anon key, service-role key, a random
   `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, and Resend keys.

Only emails present in the `members` table can obtain a session — the login
form pre-checks, and `/auth/callback` signs unknown emails straight back out.

## Environment variables

See `.env.example`. `ANTHROPIC_API_KEY` / `RECALL_API_KEY` /
`RECALL_WEBHOOK_SECRET` are Phase 2 only; the meeting-bot code stays inert
until they are set.

## Cron

One daily job hits `GET /api/cron/daily` at **02:30 UTC (08:00 IST)** with
`Authorization: Bearer $CRON_SECRET`. The dispatcher
(`lib/cron/dispatcher.ts`) branches on the IST date for daily / Monday /
1st-of-month / mid-year / year-end tasks. All thresholds are read from
`compliance_config` — nothing is hardcoded.

- **Vercel:** `vercel.json` already declares the schedule; set the `CRON_SECRET`
  env var and Vercel sends the bearer token automatically.
- **Railway / other:** add a scheduled job that runs
  `node scripts/trigger-cron.mjs` (needs `NEXT_PUBLIC_APP_URL` + `CRON_SECRET`).
- **Manual test:** `npm run cron:local`.

## Dates

Every day/due comparison runs in `Asia/Kolkata` via `lib/dates.ts`. Never
compare a `date` column against `new Date()` directly.

## Testing

```bash
npm test            # vitest: date + compliance unit tests
```

`tests/rls.test.ts` is an RLS smoke test that runs only when a local Supabase
is up and `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SERVICE_ROLE_KEY`
are set (printed by `npx supabase status`). It asserts a plain EC member sees
zero rows in `society_members` and none of other members' `expense_claims`.
