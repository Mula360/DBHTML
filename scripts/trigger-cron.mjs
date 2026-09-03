/**
 * Host-agnostic cron trigger. Point any scheduler at this:
 *   node scripts/trigger-cron.mjs
 *
 * Needs NEXT_PUBLIC_APP_URL (or APP_URL) and CRON_SECRET in the environment.
 * On Railway: add a second service with cron schedule "30 2 * * *" and
 * start command `node scripts/trigger-cron.mjs`.
 * On Vercel: vercel.json handles it — this script is not needed there.
 */
const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!base || !secret) {
  console.error("Missing NEXT_PUBLIC_APP_URL/APP_URL or CRON_SECRET");
  process.exit(1);
}
const res = await fetch(`${base.replace(/\/$/, "")}/api/cron/daily`, {
  headers: { authorization: `Bearer ${secret}` },
});
const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
