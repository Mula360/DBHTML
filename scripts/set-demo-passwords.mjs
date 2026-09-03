/**
 * Create / reset the password-login test accounts, and link them to the
 * matching member rows. Reads .env.local (needs the service-role key).
 *
 *   node scripts/set-demo-passwords.mjs           # set the defaults below
 *   node scripts/set-demo-passwords.mjs --clear   # delete the auth users + unlink
 *
 * Regular members use magic links and have no password — this only affects the
 * three accounts listed. Remove them before going live.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const U = env.SUPABASE_URL;
const h = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
};

const ACCOUNTS = [
  { email: "member1@example.com", password: "DeccanAdmin2026", note: "President (admin)" },
  { email: "member10@example.com", password: "DeccanMember2026", note: "EC5 (member)" },
  { email: "srikanth@deccanbirders.org", password: "DeccanSec2026", note: "Secretary (admin)" },
];

const clear = process.argv.includes("--clear");

for (const a of ACCOUNTS) {
  const list = await fetch(
    `${U}/auth/v1/admin/users?filter=${encodeURIComponent(a.email)}`,
    { headers: h },
  ).then((r) => r.json());
  const existing = (list.users ?? []).find((u) => u.email === a.email);

  if (clear) {
    if (existing) {
      await fetch(`${U}/auth/v1/admin/users/${existing.id}?hard_delete=true`, {
        method: "DELETE",
        headers: h,
      });
    }
    await fetch(`${U}/rest/v1/members?email=eq.${encodeURIComponent(a.email)}`, {
      method: "PATCH",
      headers: { ...h, prefer: "return=minimal" },
      body: JSON.stringify({ auth_id: null }),
    });
    console.log(`cleared  ${a.email}`);
    continue;
  }

  let id = existing?.id;
  if (id) {
    await fetch(`${U}/auth/v1/admin/users/${id}`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ password: a.password, email_confirm: true }),
    });
  } else {
    const created = await fetch(`${U}/auth/v1/admin/users`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        email: a.email,
        password: a.password,
        email_confirm: true,
      }),
    }).then((r) => r.json());
    id = created.id;
  }
  await fetch(`${U}/rest/v1/members?email=eq.${encodeURIComponent(a.email)}`, {
    method: "PATCH",
    headers: { ...h, prefer: "return=minimal" },
    body: JSON.stringify({ auth_id: id }),
  });
  console.log(`set      ${a.email.padEnd(30)} ${a.password.padEnd(18)} ${a.note}`);
}
