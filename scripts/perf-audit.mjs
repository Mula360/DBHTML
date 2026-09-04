#!/usr/bin/env node
/**
 * Page + API lead-time audit.
 *
 *   BASE_URL=https://dbhtml.vercel.app \
 *   SESSION_COOKIE='sb-<ref>-auth-token=...' \
 *   CRON_SECRET=... \
 *   node scripts/perf-audit.mjs
 *
 * SESSION_COOKIE: copy the `sb-*-auth-token` cookie from a logged-in browser
 * (DevTools → Application → Cookies). Without it, authed routes report 307.
 * Writes docs/PERF-AUDIT.md.
 */
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const COOKIE = process.env.SESSION_COOKIE || "";
const CRON = process.env.CRON_SECRET || "";
const WARM = 10;

const ROUTES = [
  ["/login", {}],
  ["/dashboard", {}],
  ["/my-tasks", {}],
  ["/meetings", {}],
  ["/action-items", {}],
  ["/walks", {}],
  ["/events", {}],
  ["/pitta", {}],
  ["/compliance", {}],
  ["/portfolios", {}],
  ["/portfolios/Website", {}],
  ["/membership", {}],
  ["/finances", {}],
  ["/statutory", {}],
  ["/documents", {}],
  ["/reports", {}],
  ["/reports/ec", {}],
  ["/reports/digests", {}],
  ["/notifications", {}],
  ["/settings", {}],
  ["/content", {}],
  ["/api/health", {}],
  ["/api/cron/daily", { headers: { authorization: `Bearer ${CRON}` } }],
];

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function timeOnce(path, opts) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    redirect: "manual",
    headers: { cookie: COOKIE, ...(opts.headers || {}) },
  });
  await res.arrayBuffer();
  return { ms: performance.now() - t0, status: res.status };
}

const rows = [];
for (const [path, opts] of ROUTES) {
  const cold = await timeOnce(path, opts);
  const samples = [];
  for (let i = 0; i < WARM; i++) samples.push((await timeOnce(path, opts)).ms);
  samples.sort((a, b) => a - b);
  rows.push({
    path,
    status: cold.status,
    cold: Math.round(cold.ms),
    p50: Math.round(pct(samples, 50)),
    p95: Math.round(pct(samples, 95)),
  });
  console.log(
    `${path.padEnd(28)} ${cold.status}  cold ${Math.round(cold.ms)}ms  p50 ${Math.round(
      pct(samples, 50),
    )}ms  p95 ${Math.round(pct(samples, 95))}ms`,
  );
}

const table = [
  "| Route | Status | Cold (ms) | Warm p50 | Warm p95 | Verdict |",
  "|---|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| \`${r.path}\` | ${r.status} | ${r.cold} | ${r.p50} | ${r.p95} | ${
        r.p95 < 800 ? "ok" : r.p95 < 1500 ? "watch" : "slow"
      } |`,
  ),
].join("\n");

const md = `# Performance audit

- Base URL: \`${BASE}\`
- Run: ${new Date().toISOString()}
- Method: 1 cold request then ${WARM} warm; session cookie ${COOKIE ? "present" : "MISSING (authed routes 307)"}.

${table}

## Notes

- Target: every page warm p95 < 800 ms; \`/api/cron/daily\` full run < 55 s.
- Re-run after any index / pagination fix and keep both tables.
`;
writeFileSync("docs/PERF-AUDIT.md", md);
console.log("\nwrote docs/PERF-AUDIT.md");
