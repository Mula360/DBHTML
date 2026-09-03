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

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const svc = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a confirmed auth user for a seeded EC member, link auth_id, sign in.
const TEST_PW = "rls-test-Passw0rd!";
async function signInAs(email) {
  // create (ignore "already exists")
  const created = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: svc,
      authorization: `Bearer ${svc}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password: TEST_PW, email_confirm: true }),
  }).then((r) => r.json());

  let userId = created.id;
  if (!userId) {
    const list = await fetch(
      `${URL_}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers: { apikey: svc, authorization: `Bearer ${svc}` } },
    ).then((r) => r.json());
    userId = (list.users ?? []).find((u) => u.email === email)?.id;
    // ensure password + confirmed
    if (userId) {
      await fetch(`${URL_}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          apikey: svc,
          authorization: `Bearer ${svc}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: TEST_PW, email_confirm: true }),
      });
    }
  }

  await fetch(`${URL_}/rest/v1/members?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: {
      apikey: svc,
      authorization: `Bearer ${svc}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ auth_id: userId }),
  });

  const tok = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PW }),
  }).then((r) => r.json());
  return tok.access_token;
}

function asUser(jwt) {
  return (path, opts = {}) =>
    fetch(`${URL_}/rest/v1${path}`, {
      ...opts,
      headers: {
        apikey: anon,
        authorization: `Bearer ${jwt}`,
        ...(opts.headers || {}),
      },
    });
}

const secretaryJwt = await signInAs("srikanth@deccanbirders.org"); // Secretary
const ec5Jwt = await signInAs("member10@example.com"); // plain member

console.log("Secretary session:", secretaryJwt ? "ok" : "FAILED");
console.log("EC5 session:", ec5Jwt ? "ok" : "FAILED");

const sec = asUser(secretaryJwt);
const ec5 = asUser(ec5Jwt);

const pos = await sec("/rpc/get_my_position", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
}).then((r) => r.json());
console.log(`\nget_my_position() as Secretary -> ${JSON.stringify(pos)}`);

const pos5 = await ec5("/rpc/get_my_position", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
}).then((r) => r.json());
console.log(`get_my_position() as EC5       -> ${JSON.stringify(pos5)}`);

// Seed one general member + one expense claim owned by the Secretary
await fetch(`${URL_}/rest/v1/society_members`, {
  method: "POST",
  headers: {
    apikey: svc,
    authorization: `Bearer ${svc}`,
    "content-type": "application/json",
    prefer: "return=minimal",
  },
  body: JSON.stringify({ name: "General Person", status: "Active" }),
});
const secMember = await fetch(
  `${URL_}/rest/v1/members?email=eq.srikanth@deccanbirders.org&select=id`,
  { headers: { apikey: svc, authorization: `Bearer ${svc}` } },
).then((r) => r.json());
await fetch(`${URL_}/rest/v1/expense_claims`, {
  method: "POST",
  headers: {
    apikey: svc,
    authorization: `Bearer ${svc}`,
    "content-type": "application/json",
    prefer: "return=minimal",
  },
  body: JSON.stringify({
    member_id: secMember[0].id,
    amount: 500,
    description: "RLS test claim",
  }),
});

console.log("\n--- RLS: EC5 (plain member) must be walled off ---");
const sm = await ec5("/society_members?select=*").then((r) => r.json());
console.log(
  `EC5 society_members  -> ${Array.isArray(sm) ? `${sm.length} rows` : JSON.stringify(sm)}  ${
    Array.isArray(sm) && sm.length === 0 ? "PASS" : "FAIL"
  }`,
);
const ec = await ec5("/expense_claims?select=*").then((r) => r.json());
console.log(
  `EC5 expense_claims   -> ${Array.isArray(ec) ? `${ec.length} rows` : JSON.stringify(ec)}  ${
    Array.isArray(ec) && ec.length === 0 ? "PASS" : "FAIL"
  }`,
);

console.log("\n--- RLS: Secretary can see these ---");
const smS = await sec("/society_members?select=*").then((r) => r.json());
console.log(
  `Secretary society_members -> ${Array.isArray(smS) ? `${smS.length} rows` : JSON.stringify(smS)}  ${
    Array.isArray(smS) && smS.length >= 1 ? "PASS" : "FAIL"
  }`,
);
const ecS = await sec("/expense_claims?select=*").then((r) => r.json());
console.log(
  `Secretary expense_claims  -> ${Array.isArray(ecS) ? `${ecS.length} rows` : JSON.stringify(ecS)}  ${
    Array.isArray(ecS) && ecS.length >= 1 ? "PASS" : "FAIL"
  }`,
);

console.log("\n--- RLS: everyone sees members + action_items ---");
const mem = await ec5("/members?select=id").then((r) => r.json());
console.log(
  `EC5 members -> ${Array.isArray(mem) ? `${mem.length} rows` : JSON.stringify(mem)}  ${
    Array.isArray(mem) && mem.length === 10 ? "PASS" : "FAIL"
  }`,
);
