# Deccan Birders EC Portal — `deccan-birders-ec`

## Context

The Executive Committee (10 members) of Deccan Birders, a Hyderabad birding society, needs a
private internal tool to run committee operations: meetings + minutes, action-item tracking with
automated reminders, a dynamic compliance/"baseline obligations" tracker, field walks, annual
events (incl. AGM statutory calculator), the Pitta newsletter, 11 portfolio pages, a ~570-row
general membership register, expense claims, a documents register, and reports.

Starting point: `~/Desktop/DeccanBirders EC Tool/Deccan Birders EC Portal (offline).html` — a
Claude Design canvas export that is a **visual prototype only** (10 screens, all data hardcoded,
no backend). Also the sole file in GitHub repo `Mula360/DBHTML`. It is a useful **visual
reference** for screen inventory and layout; the new app is built fresh per the spec below.

The user has supplied a complete spec: environment variables, a full Postgres schema (first
migration), and 12 sequential build prompts. This plan organizes that spec into an execution
plan; it does not restate every prompt verbatim.

## Stack

- **Next.js 14** (App Router), TypeScript
- **Supabase** — Postgres + Auth (magic-link OTP only) + Row Level Security on every table
- **Resend** for transactional email; every send also writes a `notifications` row
- **Cron**: one daily dispatcher hit at 02:30 UTC / 08:00 IST → `GET /api/cron/daily`
  (Bearer `CRON_SECRET`); the route branches on the IST date for daily / Monday / 1st-of-month /
  mid-year / year-end tasks
- **Phase 2 only**: Recall.ai meeting bot + Claude API (`claude-sonnet-4-6`) MoM extraction
- Global date rule: all day/due comparisons in `Asia/Kolkata` via
  `Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata'})` — never `new Date()` directly

## Execution phases (map to the supplied prompts)

| # | Prompt | Deliverable |
|---|--------|-------------|
| 0 | — | Scaffold Next.js 14 + Supabase client/server libs, `lib/dates.ts`, `lib/resend.ts`, `lib/notifications.ts`, env template, CI |
| 1 | P1 | Schema migration; magic-link auth gated to `members` table; RLS on all tables + `get_my_position()` helper; seed term 2026-28, `compliance_config`, 10 members+positions, 11 portfolio assignments; app shell (topbar, sidebar, dashboard); **RLS test** (plain member sees zero rows in `society_members` / others' `expense_claims`) |
| 2 | P2 | Action Items module + the `/api/cron/daily` dispatcher (all thresholds from `compliance_config`) |
| 3 | P3 | Meetings + MoM + live quorum computation (Rule 26) |
| 4 | P4 | Compliance / Baseline Obligations tracker — 10×4 RAG grid, config-driven, audit on every change, cron hooks |
| 5 | P5 | Walks (eBird-first, multi-coordinator, no species/photo entry); wire `getUpcomingWalks()` |
| 6 | P6 | Events + AGM statutory calculator + Statutory Tracker page |
| 7 | P7 | Pitta newsletter module (feeds compliance obligation 4) |
| 8 | P8 | 11 portfolio pages + HBA/AWC/BirdRace conditional panels |
| 9 | P9 | Membership register — CSV import/export, soft delete, status recompute in dispatcher |
| 10 | P10 | Reports — per-member annual, EC-wide grid, attendance heatmap, digest archive |
| 11 | P11 | Documents register (links only) + expense claims (Treasurer approval flow) |
| 12 | P12 | **Phase 2** — Recall.ai bot + Claude MoM extraction; nothing emails without Secretary approval |

## Key cross-cutting rules (apply throughout)

- **Nothing hardcoded** that lives in `compliance_config` — thresholds, windows, quorum fraction,
  alert months all read from the row for the current term.
- **RLS is written before any UI for a table.** `society_members` and `expense_claims` are the
  sharpest cases (position-restricted / owner-plus-Treasurer).
- Every automated email → `createNotification(member_id, type, title, body, link)` as well.
- Helper stubs must degrade gracefully before their module ships (e.g. `getUpcomingWalks()` → `[]`).

## Critical files (created)

- `supabase/migrations/0001_init.sql` — the full schema
- `supabase/migrations/0002_rls.sql` — RLS + `get_my_position()`
- `supabase/seed.sql` (or `scripts/seed.ts`) — term, config, members, portfolios
- `lib/supabase/{client,server}.ts`, `lib/dates.ts`, `lib/resend.ts`, `lib/notifications.ts`,
  `lib/compliance.ts` (`getComplianceYear`, obligation calculators)
- `app/api/cron/daily/route.ts` — the dispatcher
- `app/(app)/**` — one route group per module; `app/login/`
- `railway.json` or `vercel.json` — cron schedule (per hosting choice)
- `middleware.ts` — auth gate

## Verification

- `supabase db reset` applies migrations + seed clean
- Automated: RLS test from P1 (Vitest/Playwright) — plain EC member gets zero restricted rows;
  compliance calculators unit-tested against `compliance_config` variations; quorum math tested
  (in-person vs virtual, `virtual_counts_for_quorum` on/off)
- Manual: magic-link login as a seeded member; unknown email is refused; create meeting →
  attendance → quorum banner; create overdue action item → run `/api/cron/daily` locally with the
  Bearer secret → assignee + portfolio lead notified; edit a `compliance_config` value → audit row
  written + dashboards recompute
- `next build` + lint clean in CI

## Decisions (from user)

- **Scope:** build all 12 prompts (P0–P12), including the Phase 2 Recall.ai bot + Claude MoM
  extraction. P12 code paths ship but stay inert until `ANTHROPIC_API_KEY` / `RECALL_API_KEY`
  are set.
- **Hosting:** host-agnostic. `/api/cron/daily` is a plain authenticated GET callable by any
  scheduler. Ship BOTH `railway.json` and `vercel.json` cron configs + a README section; pick at
  deploy time.
- **Supabase:** none exists yet. Deliver `supabase/migrations/*`, seed, and `.env.example` with
  placeholders. README gives exact steps to create the project, run `supabase db reset`, and set
  env vars. No live DB work in this build.
- **Repo:** build in `~/deccan-birders-ec`, then push to the existing `Mula360/DBHTML` repo. Move
  the current `Deccan Birders EC Portal (offline).html` into `prototype/` in that repo (kept as
  visual reference, not wired into the app). Force-free: new commits on top of `main`.
- Member names/emails for the seed are not yet provided → seed uses placeholder names +
  `member1@example.com …`, overridable via a `scripts/seed-data.json` file the user edits.

## Notes on execution

- Because there is no live Supabase, phases 2–12 are built against the schema/types (generated
  via `supabase gen types typescript`) and covered by unit tests + local `supabase start`
  (Docker) where the user has Docker; the RLS test from P1 runs against local Supabase.
- Given the size, work proceeds phase by phase with a working `next build` at each checkpoint;
  the user reviews after P1 and after each subsequent phase group.
