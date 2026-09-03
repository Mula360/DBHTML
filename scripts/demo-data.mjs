/**
 * Populates the live project with a realistic demo dataset for visual review.
 *   node scripts/demo-data.mjs          # seed
 *   node scripts/demo-data.mjs --wipe   # remove all transactional rows
 * Reads .env.local. Does NOT touch members / positions / portfolios / config.
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
const TX = [
  "meeting_attendance", "walk_coordinators", "walk_attendance", "event_helpers",
  "pitta_contributions", "action_comments", "moms", "notifications",
  "action_items", "meetings", "walks", "events", "pitta_issues", "documents",
  "statutory_items", "expense_claims", "society_members", "digest_log",
  "agm_checklists", "portfolio_updates",
];

async function wipe() {
  for (const t of TX) await fetch(`${U}/rest/v1/${t}?id=not.is.null`, { method: "DELETE", headers: h });
  console.log("wiped");
}

const G = (p) => fetch(`${U}/rest/v1/${p}`, { headers: h }).then((r) => r.json());
async function ins(table, body, ret = false) {
  const r = await fetch(`${U}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...h, prefer: ret ? "return=representation" : "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return ret ? r.json() : null;
}

async function seed() {
  const mem = await G("members?select=id,name,email&order=email");
  const by = Object.fromEntries(mem.map((m) => [m.email, m.id]));
  const M = (n) => by[`member${n}@example.com`];
  const SEC = by["srikanth@deccanbirders.org"];
  const term = (await G("terms?select=id&is_current=eq.true"))[0].id;
  const P = (n) => (n === 4 ? SEC : M(n));

  const AI = [
    ["Send Pitta 44 layout brief to designer", P(2), "2026-08-28", "High", "Pitta", "InProgress"],
    ["Confirm Osman Sagar walk meeting point", P(1), "2026-09-06", "Normal", "BirdRace", "InProgress"],
    ["Upload July trip report to website", P(1), "2026-09-04", "Normal", "Website", "Open"],
    ["Collect 3 grid-square volunteers for HBA", P(8), "2026-09-05", "High", "HBA", "Open"],
    ["Draft Bird Race route list (4 routes)", P(3), "2026-09-18", "Normal", "BirdRace", "Open"],
    ["Reply to Wetlands Intl on AWC site list", P(3), "2026-09-30", "Normal", "AWC", "Open"],
    ["Membership renewal page copy review", P(2), "2026-10-12", "Low", "Website", "Open"],
    ["Book Annual Dinner venue — 2 quotes", P(5), "2026-09-30", "Normal", "AnnualDinner", "Open"],
    ["Publish August walk announcement", SEC, "2026-08-22", "Normal", "Website", "Done"],
    ["AWC volunteer teams for 6 sites", P(3), "2026-08-18", "High", "AWC", "Done"],
    ["Pitta 43 published and mailed", P(2), "2026-08-02", "Normal", "Pitta", "Done"],
    ["Outreach stall at city book fair", P(7), null, "Low", "General", "Dropped"],
  ];
  for (const [title, who, due, pri, tag, st] of AI)
    await ins("action_items", {
      title, assigned_to: who, due_date: due, priority: pri,
      portfolio_tag: tag, status: st, created_by: SEC,
      completed_at: st === "Done" ? new Date().toISOString() : null,
      dropped_reason: st === "Dropped" ? "Not enough volunteers" : null,
    });

  for (const [title, date, status, present] of [
    ["EC Meeting · June", "2026-06-12", "Published", 10],
    ["EC Meeting · July", "2026-07-10", "Published", 9],
    ["EC Meeting · August", "2026-08-14", "MoMDraft", 8],
    ["EC Meeting · September", "2026-09-11", "AgendaSent", 0],
  ]) {
    const mt = (await ins("meetings", {
      title, date, time: "18:30 IST", status,
      meet_link: "https://meet.google.com/abc-defg-hij", created_by: SEC,
      quorum_met: present >= 4 ? true : present > 0 ? false : null,
    }, true))[0];
    for (let i = 1; present > 0 && i <= 10; i++)
      await ins("meeting_attendance", {
        meeting_id: mt.id, member_id: P(i),
        status: i <= present ? "present" : i === present + 1 ? "apology" : "absent",
        attendance_mode: i === present ? "virtual" : "in_person",
      });
  }

  for (const [title, location, date, type, coords] of [
    ["Osman Sagar walk", "Osman Sagar", "2026-09-06", "Local", [M(6)]],
    ["Ameenpur lake walk", "Ameenpur", "2026-08-24", "Local", [M(1), M(3)]],
    ["Manjeera outstation trip", "Manjeera WLS", "2026-07-27", "Outstation", [M(9)]],
  ]) {
    const w = (await ins("walks", {
      title, location, date, type, meet_time: "06:30", meet_point: "Second gate",
      ebird_list_url: "https://ebird.org/checklist/S000", created_by: SEC,
    }, true))[0];
    for (const c of coords) await ins("walk_coordinators", { walk_id: w.id, member_id: c });
    for (let i = 1; i <= 6; i++)
      await ins("walk_attendance", {
        walk_id: w.id, member_id: P(i), rsvp_status: "attending",
        actually_attended: date < "2026-09-01",
      });
  }

  for (const [title, type, date, status, lead] of [
    ["Bird Race 2027", "BirdRace", "2027-01-17", "Planning", M(3)],
    ["Annual Dinner", "AnnualDinner", "2026-11-28", "Planning", M(2)],
    ["AWC 2026", "AWC", "2026-01-15", "Done", M(3)],
  ]) {
    const e = (await ins("events", { title, type, date, venue: "TBD", portfolio_tag: type, lead_id: lead, status }, true))[0];
    for (const i of [5, 7, 8])
      await ins("event_helpers", { event_id: e.id, member_id: M(i), confirmed_by_lead: status === "Done" });
  }

  const pid = (await ins("pitta_issues", {
    issue_number: "43", theme: "Wetlands of the Deccan",
    target_publish_date: "2026-07-15", actual_publish_date: "2026-07-20", status: "Published",
  }, true))[0].id;
  for (const i of [1, 2, 3, 5])
    await ins("pitta_contributions", { issue_id: pid, member_id: M(i), contribution_title: "Field notes", submitted_at: "2026-07-20" });
  await ins("pitta_issues", { issue_number: "44", theme: "Raptor migration", target_publish_date: "2026-10-15", status: "Layout" });

  for (const [t, cat, url] of [
    ["Deccan Birders Bye-laws", "ByeLaws", "https://drive.google.com/byelaws"],
    ["Roles & Responsibilities Framework", "Other", "https://drive.google.com/rr"],
    ["MoM Archive 2024-26", "MoMArchive", "https://drive.google.com/mom"],
  ])
    await ins("documents", { title: t, category: cat, url, added_by: SEC, term_id: term });

  await ins("statutory_items", { title: "Post-AGM Registrar filing", authority: "Registrar", due_date: "2026-11-15", status: "Pending", recurring_yearly: true, term_id: term });
  await ins("statutory_items", { title: "Annual IT return", authority: "IT Dept", due_date: "2026-09-30", status: "InProgress", recurring_yearly: true, term_id: term });
  await ins("expense_claims", { member_id: M(6), amount: 1450, description: "Manjeera trip transport", status: "Pending" });
  await ins("expense_claims", { member_id: M(3), amount: 800, description: "AWC printing", status: "Approved" });

  const sm = [];
  for (let i = 0; i < 40; i++) {
    const st = ["Active", "Active", "Active", "Due", "Lapsed", "Life"][i % 6];
    sm.push({
      name: `General Member ${i + 1}`, email: `gm${i + 1}@example.com`, city: "Hyderabad",
      membership_type: st === "Life" ? "Life" : "Annual", membership_number: `DB${2000 + i}`,
      joined_date: "2022-04-01", renewal_due_date: st === "Life" ? null : "2026-10-15", status: st,
    });
  }
  await ins("society_members", sm);

  for (const [t, b, ty] of [
    ["Monday digest — your open items", "2 overdue, 3 due this week", "weekly_digest"],
    ["Agenda: EC Meeting September", "Mails 8 Sep", "meeting_agenda"],
    ["Pitta contribution nudge", "Window lapses in ~30 days", "pitta_nudge"],
  ])
    await ins("notifications", { member_id: M(1), type: ty, title: t, body: b, link: "/dashboard" });

  console.log("seeded demo data.");
}

if (process.argv.includes("--wipe")) await wipe();
else await seed();
