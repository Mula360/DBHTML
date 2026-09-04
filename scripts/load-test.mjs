#!/usr/bin/env node
/**
 * Tiny load simulation (no deps).
 *   BASE_URL=https://dbhtml.vercel.app SESSION_COOKIE='...' node scripts/load-test.mjs
 * Fires N concurrent workers for DURATION seconds against a few hot paths and
 * reports req/s, latency p50/p99 and error rate.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const COOKIE = process.env.SESSION_COOKIE || "";
const PATHS = (process.env.PATHS || "/login,/dashboard,/meetings").split(",");
const DURATION = Number(process.env.DURATION || 30);
const LEVELS = (process.env.LEVELS || "10,25").split(",").map(Number);

function p(sorted, q) {
  return sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))];
}

async function run(concurrency) {
  const deadline = Date.now() + DURATION * 1000;
  const lat = [];
  let ok = 0;
  let err = 0;
  const worker = async () => {
    while (Date.now() < deadline) {
      const path = PATHS[Math.floor(Math.random() * PATHS.length)];
      const t0 = performance.now();
      try {
        const res = await fetch(BASE + path, {
          redirect: "manual",
          headers: { cookie: COOKIE },
        });
        await res.arrayBuffer();
        lat.push(performance.now() - t0);
        if (res.status < 400 || res.status === 307) ok++;
        else err++;
      } catch {
        err++;
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  lat.sort((a, b) => a - b);
  const total = ok + err;
  console.log(
    `c=${concurrency}  ${total} reqs  ${(total / DURATION).toFixed(1)} req/s  ` +
      `p50 ${Math.round(p(lat, 50))}ms  p99 ${Math.round(p(lat, 99))}ms  ` +
      `errors ${((err / total) * 100).toFixed(1)}%`,
  );
}

console.log(`Load test: ${PATHS.join(", ")} for ${DURATION}s at ${LEVELS.join(", ")} conc.`);
for (const c of LEVELS) await run(c);
