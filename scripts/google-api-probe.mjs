#!/usr/bin/env node
/**
 * Times the Google API calls the nightly ingest makes, so we can confirm the
 * whole run fits inside the cron function's 60 s budget.
 *
 *   GOOGLE_SA_KEY_JSON='{...}' GOOGLE_IMPERSONATE_SUBJECT=sec@domain \
 *   GOOGLE_MEET_SPACE_CODE=abc-defg-hij node scripts/google-api-probe.mjs
 *
 * Uses tsx to import the app's own lib/google modules.
 */
import { createSign } from "node:crypto";

const raw = process.env.GOOGLE_SA_KEY_JSON;
const subject = process.env.GOOGLE_IMPERSONATE_SUBJECT;
const code = process.env.GOOGLE_MEET_SPACE_CODE;
if (!raw || !subject || !code) {
  console.error("Set GOOGLE_SA_KEY_JSON, GOOGLE_IMPERSONATE_SUBJECT, GOOGLE_MEET_SPACE_CODE");
  process.exit(1);
}
const key = JSON.parse(raw);
const b64 = (s) =>
  Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const scope = [
    "https://www.googleapis.com/auth/meetings.space.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
  ].join(" ");
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(
    JSON.stringify({
      iss: key.client_email,
      sub: subject,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = b64(
    createSign("RSA-SHA256").update(`${head}.${claims}`).sign(key.private_key),
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${sig}`,
    }),
  });
  return (await res.json()).access_token;
}

const time = async (label, fn) => {
  const t0 = performance.now();
  const out = await fn();
  console.log(`${label.padEnd(34)} ${Math.round(performance.now() - t0)}ms`);
  return out;
};

const t = await time("token exchange", token);
const get = (u) => fetch(u, { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json());

const filter = encodeURIComponent(`space.meeting_code="${code}"`);
const recs = await time("conferenceRecords.list", () =>
  get(`https://meet.googleapis.com/v2/conferenceRecords?filter=${filter}&pageSize=10`),
);
const first = recs.conferenceRecords?.[0];
if (first) {
  const parts = await time("participants.list", () =>
    get(`https://meet.googleapis.com/v2/${first.name}/participants?pageSize=100`),
  );
  const p0 = parts.participants?.[0];
  if (p0)
    await time("participantSessions.list", () =>
      get(`https://meet.googleapis.com/v2/${p0.name}/participantSessions?pageSize=100`),
    );
  console.log(`\n${parts.participants?.length ?? 0} participants on the latest call.`);
} else {
  console.log("\nNo conference records yet for that Meet code.");
}
