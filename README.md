# Deccan Birders EC Portal

Private internal tool for the 10-member Executive Committee of Deccan Birders
(a birding society in Hyderabad). Meetings & minutes, action-item tracking with
automated reminders, a dynamic compliance / "baseline obligations" tracker,
field walks, annual events (incl. AGM statutory calculator), the Pitta
newsletter, 11 portfolio pages, a ~570-member general register, expense claims,
documents, and reports.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Resend ·
host-agnostic daily cron. Phase 12 adds a Recall.ai meeting bot + Claude MoM
extraction.

The earlier single-file design prototype lives in [`prototype/`](./prototype)
for visual reference — it is not wired into the app.

---

## Status — all 12 build phases complete

| Phase | Scope |
|-------|-------|
| 0 | Scaffold, lib helpers, CI |
| 1 | Schema + RLS (`get_my_position()`, position helpers) + magic-link auth gated to the `members` table + seed + app shell/dashboard |
| 2 | Action Items (list/filter/create/detail/comments/status) + the full daily cron dispatcher |
| 3 | Meetings + structured MoM editor + live Rule 26 quorum + agenda/MoM emails |
| 4 | Compliance / Baseline Obligations tracker (config-driven, audited) + cron pace/Pitta/year-end hooks |
| 5 | Walks & Field Trips (eBird-first, multi-coordinator, RSVP + attendance) |
| 6 | Events + AGM statutory calculator + Statutory Tracker + T-30/7/1 reminders |
| 7 | Pitta Newsletter (issues, per-issue contribution table, publish → compliance) |
| 8 | 11 portfolio pages + HBA/AWC/Bird Race panels |
| 9 | Membership Register — CSV import wizard + export, soft delete, status recompute |
| 10 | Reports — per-member annual, EC-wide grid, portfolio summary, attendance heatmap, digest archive |
| 11 | Documents register + Expense Claims (Treasurer approval flow) |
| 12 | Recall.ai meeting bot + Claude MoM extraction (inert until keys are set) |

**Verified against a live Supabase project:** `npm run build`, `npm run lint`,
`npm run typecheck`, 22 unit tests, plus `scripts/e2e-test.mjs` — 42 positive +
negative RLS / workflow assertions across 5 roles (President, VP-1, Secretary,
Treasurer, plain EC member).

## Local development

Requires Node 20+ and (for a real database) a Supabase project — see
[`docs/SUPABASE-SETUP.md`](./docs/SUPABASE-SETUP.md) for the one-time setup.

```bash
npm install
cp .env.example .env.local          # fill in Supabase URL + keys + CRON_SECRET

npm run dev                          # http://localhost:3000
```

Migrations live in `supabase/migrations/` (run them in order via the Supabase
SQL Editor, or `supabase db push` after `supabase link`). `supabase/seed.sql`
seeds term 2026-28, the default `compliance_config`, 10 members + positions and
11 portfolio assignments — edit the member arrays before going live.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm test` | Vitest unit tests (dates, compliance maths, quorum, RAG, member-status) |
| `npm run test:e2e` | Live-DB positive/negative RLS + workflow test (needs `.env.local` + service key) |
| `npm run verify:db` | Table reachability + seed counts + anon lockout |
| `npm run verify:rls` | Sign in as two roles, assert the `society_members` / `expense_claims` walls |
| `npm run cron:local` | Fire `GET /api/cron/daily` against the running app |
| `npm run typecheck` | `tsc --noEmit` |

## Types

`lib/database.types.ts` is hand-authored and verified against the live schema
(narrowed status unions, sensible nullability). If you get Docker + the Supabase
CLI, `npx supabase gen types typescript --local` regenerates it.

## Cron

One daily job hits `GET /api/cron/daily` at **02:30 UTC (08:00 IST)** with
`Authorization: Bearer $CRON_SECRET`. The dispatcher (`lib/cron/dispatcher.ts`)
branches on the IST date; every task is isolated and reads its thresholds from
`compliance_config`. Tasks: action-item reminders (due-soon / newly-overdue /
7+-day escalation), walk-tomorrow reminders, society-member status recompute,
statutory 14-day reminders, event T-30/7/1 reminders, recurring-statutory
clone, Pitta nudge; **Monday** per-member digest; **1st of month** EC-wide
digest + renewals list; **mid-year** pace alert; **year-end** compliance report.

- **Vercel:** `vercel.json` declares the schedule; set `CRON_SECRET` and Vercel
  sends the bearer token automatically.
- **Railway / other:** a scheduled job running `node scripts/trigger-cron.mjs`.

## Dates

Every day/due comparison runs in `Asia/Kolkata` via `lib/dates.ts`. Never
compare a `date` column against `new Date()` directly.

## Environment variables

See `.env.example`. `ANTHROPIC_API_KEY` / `RECALL_API_KEY` /
`RECALL_WEBHOOK_SECRET` gate the Phase 12 meeting bot — the code paths ship but
stay inert until they are set. `ANTHROPIC_MODEL` overrides the MoM-extraction
model (default `claude-sonnet-4-6`).
