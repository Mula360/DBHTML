# Performance audit

> Regenerate with `node scripts/perf-audit.mjs` (needs `BASE_URL`, a logged-in
> `SESSION_COOKIE`, and `CRON_SECRET`). Load test: `node scripts/load-test.mjs`.
> Google-API timings: `node scripts/google-api-probe.mjs`.

## Method

1. `node scripts/seed-load-data.mjs` against a **staging** DB to reach realistic
   scale (5 terms, 60 meetings, 600 action items, 570 society members, 2 000
   notifications, 200 walks).
2. `perf-audit.mjs` — 1 cold + 10 warm requests per route; records status, cold,
   warm p50/p95.
3. `load-test.mjs` — 10 and 25 concurrent connections × 30 s on `/login`,
   `/dashboard`, `/meetings`.
4. `google-api-probe.mjs` — times each Meet/Drive/Docs call; confirms the full
   `runGoogleMeetIngest` fits the 60 s cron budget.
5. Chrome DevTools on the heavy pages (dashboard, compliance, reports/ec,
   membership) for DOMContentLoaded + LCP.

## Targets

| Metric | Target |
|---|---|
| Any page, warm p95 | < 800 ms |
| `/api/health` warm | < 300 ms |
| `/api/cron/daily` full run | < 55 s |
| Load p99 @ 25 conc | < 2 s, 0 errors |

## Results — page & API lead-times

_Run `scripts/perf-audit.mjs` to populate this section; it overwrites the table below._

| Route | Status | Cold (ms) | Warm p50 | Warm p95 | Verdict |
|---|---|---|---|---|---|
| _pending first run_ | | | | | |

## Results — load test

_Paste `load-test.mjs` output here._

## Results — Google API

_Paste `google-api-probe.mjs` output here. Sum of token + conferenceRecords.list
+ (participants.list + participantSessions.list) × ~10 must be well under 60 s._

## Findings & fixes

- Add keyset pagination to `/membership`, `/notifications`, `/action-items` if a
  list exceeds ~100 rows.
- Confirm the earlier `app_session()` / `nav_badges()` RPC collapse still holds
  (Supabase round-trips per page should be 2 + page-specific queries).
- Bump `maxDuration` on `/api/cron/daily` only if the Google probe shows the
  ingest approaching the budget.
