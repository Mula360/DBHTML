# Performance audit — 2026-09-04

Prompted by reports that the site felt sluggish. Tested against
`https://dbhtml.vercel.app` (production) with the load dataset applied:
**3 040 society members, 64 meetings, 630 attendance rows, 612 action items,
203 walks, 2 005 notifications**. Measured from a logged-in browser (President).

## Headline findings

1. **FIXED — Vercel functions were in the wrong region.** The Supabase database
   is in **Tokyo (`ap-northeast-1`)**; the functions were pinned to **Mumbai
   (`bom1`)** from an earlier, mistaken "co-location" change. Every DB query
   made a ~5 000 km round trip. Moved to **`hnd1` (Tokyo)** — `x-vercel-id` now
   shows `…::hnd1::…` for SSR routes.
2. **The free tiers cannot serve 15 concurrent users.** Under a 15-worker load
   even `/api/health` (one tiny `count(*)`) degraded to **p50 7.5 s, ~2.8
   req/s**. The heavy pages hit **p95 31 s**. This is a capacity ceiling on
   **Supabase Free** (shared-CPU nano compute, request throttling, project
   pausing) and **Vercel Hobby** (concurrency throttling), not application code.
   *(Caveat: the load generator was a single client/IP, so Vercel's per-IP
   firewall inflates these numbers somewhat — but the ceiling is real.)*
3. **Two pages did wasteful queries** — now optimised (below).

## Single-request lead-times (1 cold + 5 warm, logged-in browser)

| Route | Status | Cold | Warm p50 | Warm p95 | Verdict |
|---|---|---|---|---|---|
| `/api/health` | 200 | 556 | 542 | 616 | ok |
| `/dashboard` | 200 | 875 | 812 | 1087 | watch |
| `/my-tasks` | 200 | 601 | 574 | 619 | ok |
| `/meetings` | 200 | 608 | 719 | 1053 | watch |
| `/action-items` | 200 | 1306 | 1058 | 1076 | watch — 612-row kanban, all fetched |
| `/walks` | 200 | 735 | 756 | 829 | ok |
| `/events` | 200 | 641 | 561 | 796 | ok |
| `/pitta` | 200 | 523 | 497 | 730 | ok |
| `/compliance` | 200 | 915 | 1411 | **4262** | **slow** — 6 round trips → now parallelised |
| `/portfolios` | 200 | 665 | 726 | 875 | ok |
| `/portfolios/Website` | 200 | 626 | 609 | 683 | ok |
| `/membership` | 200 | 2745 | **2990** | **3121** | **slow** — fetched 1000 + counted 3040 rows → now paginated 50/page + SQL counts |
| `/finances` | 200 | 894 | 528 | 1712 | watch |
| `/statutory` | 200 | 583 | 644 | 711 | ok |
| `/documents` | 200 | 565 | 602 | 851 | ok |
| `/reports` | 200 | 591 | 557 | 583 | ok |
| `/reports/ec` | 200 | 1038 | 1030 | 1151 | watch |
| `/reports/digests` | 200 | 683 | 641 | 895 | ok |
| `/notifications` | 200 | 728 | 792 | 854 | ok |
| `/settings` | 200 | 644 | 861 | 2160 | watch |
| `/content` | 200 | 821 | 505 | 587 | ok |

Baseline (browser → Vercel edge → hnd1 function → Tokyo DB → back) is ~500–600 ms
for a one-query route. Real EC users in Hyderabad see a shorter edge hop.

## Load simulation

| Scenario | req/s | p50 | p95 | p99 | errors |
|---|---|---|---|---|---|
| 5 concurrent × 18 s, mixed heavy pages | 2.2 | 1124 ms | 10 406 ms | 12 259 ms | 0 |
| 15 concurrent × 20 s, mixed heavy pages | 4.7 | 1 970 ms | 31 527 ms | 34 755 ms | 0 |
| 15 concurrent × 15 s, `/api/health` only | 2.8 | 7 558 ms | 8 035 ms | 8 593 ms | 0 |

Zero errors but severe queueing — throughput plateaus at **~3 req/s** regardless
of endpoint weight. That is the free-tier concurrency gate.

## Fixes applied (commits 86fd58a, 57f09ee, 9be3311)

- `vercel.json` regions `bom1` → `hnd1` (functions now co-located with the DB).
- `lib/compliance-compute.ts` — the 5 tally queries run in one `Promise.all`
  instead of sequentially.
- `app/(app)/membership/page.tsx` — 50 rows/page with prev/next; all tile counts
  + total come from one `society_member_summary()` RPC (migration `0008`)
  instead of fetching 3 040 rows.
- `0008` indexes: `society_members(status)`, `(name)`,
  `meeting_attendance(member_id,status)`, `action_items(assigned_to,status)`,
  `notifications(member_id) where read_at is null`.

### After — single-request warm p50 / p95 (same load dataset, logged-in browser)

| Route | Before p50 / p95 | After p50 / p95 |
|---|---|---|
| `/membership` | 2990 / 3121 | **927 / 1247** |
| `/membership?page=3` | — | 697 / 868 |
| `/compliance` | 1411 / 4262 | **787 / 1384** |
| `/meetings` | 719 / 1053 | 642 / 668 |
| `/reports/ec` | 1030 / 1151 | 943 / 1131 |
| `/dashboard` | 812 / 1087 | 925 / 966 |
| `/action-items` | 1058 / 1076 | 1101 / 1158 (unchanged — still fetches all rows) |
| `/api/health` | 542 / 616 | 529 / 573 |

Every page is now sub-1.5 s single-request. `/action-items` is the remaining
code follow-up. **Concurrency is still gated by the free tiers — see below.**

## Fixes still required — infrastructure (user decision)

To comfortably serve **15 simultaneous users** the free tiers must be upgraded:

| What | Plan | ~Cost | Why |
|---|---|---|---|
| **Supabase** | Pro (or a Compute add-on) | $25/mo | Dedicated CPU, no project pausing, far higher request/connection limits. This is the main bottleneck. |
| **Vercel** | Pro | $20/mo | Removes Hobby concurrency throttling; full multi-region/region-pin support; higher function limits. |

With both on paid tiers, re-run this audit — expect warm p95 < 800 ms on every
page and the load test to hold p95 < 2 s at 15 concurrent.

## Follow-up code work (optional, lower impact)

- `/action-items` — the kanban fetches every item; cap at ~50/column or add
  "load older".
- `/dashboard`, `/reports/ec` — audit round-trip counts; fold into an RPC like
  `app_session()` / `nav_badges()` if still > 4 queries.
- Add DB indexes on `meeting_attendance(member_id, status)`,
  `action_items(assigned_to, status)`, `society_members(status, is_deleted)` if
  `explain analyze` shows sequential scans at volume.

## How to reproduce

`node scripts/seed-load-data.mjs --apply` (SOCIETY_N=3000), then from a
logged-in browser console run the timing loop in `scripts/perf-audit.mjs`, or
`SESSION_COOKIE=… node scripts/perf-audit.mjs`. Remove the dataset with
`node scripts/seed-load-data.mjs --wipe`.
