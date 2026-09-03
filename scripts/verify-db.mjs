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

const base = `${env.SUPABASE_URL}/rest/v1`;
const svc = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.SUPABASE_ANON_KEY;

async function q(path, key, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, ...opts.headers },
    method: opts.method || "GET",
  });
  const count = res.headers.get("content-range");
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, count, body };
}

const tables = [
  "members", "terms", "member_positions", "portfolio_assignments",
  "compliance_config", "meetings", "action_items", "society_members",
  "expense_claims", "statutory_items", "notifications", "moms",
  "meeting_attendance", "walks", "events", "pitta_issues", "documents",
  "digest_log", "walk_coordinators", "agm_checklists",
];

console.log("--- table reachability (service_role) ---");
for (const t of tables) {
  const r = await q(`/${t}?select=*`, svc, {
    headers: { prefer: "count=exact", range: "0-0" },
  });
  const ok = r.status === 200 || r.status === 206;
  console.log(
    `${ok ? "ok  " : "ERR "} ${t.padEnd(22)} ${
      ok ? `count ${r.count ?? "?"}` : JSON.stringify(r.body)
    }`,
  );
}

const arr = (b) => (Array.isArray(b) ? b : []);

const pos = await q(
  "/member_positions?select=position,members(email)&order=position",
  svc,
);
console.log("\nPositions:");
for (const p of arr(pos.body))
  console.log(`  ${String(p.position).padEnd(10)} ${p.members?.email}`);

const pa = await q("/portfolio_assignments?select=portfolio_name", svc);
console.log(`\nPortfolios seeded: ${arr(pa.body).length}`);

const cfg = await q("/compliance_config?select=*", svc);
console.log(`compliance_config rows: ${arr(cfg.body).length}`);

console.log("\n--- RLS check (anon, no session) ---");
for (const t of ["society_members", "members", "action_items", "expense_claims"]) {
  const r = await q(`/${t}?select=*`, anon);
  console.log(
    `anon ${t.padEnd(18)} status ${r.status} rows ${
      Array.isArray(r.body) ? r.body.length : JSON.stringify(r.body)
    }`,
  );
}

const rpc = await q("/rpc/get_my_position", svc, { method: "POST" });
console.log(`\nget_my_position() -> status ${rpc.status}`);
