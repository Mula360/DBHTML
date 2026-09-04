/**
 * Bulk volume data for the performance audit. STAGING ONLY.
 *   node scripts/seed-load-data.mjs           # dry run — prints what it would insert
 *   node scripts/seed-load-data.mjs --apply   # actually insert
 *   node scripts/seed-load-data.mjs --wipe    # delete rows tagged by this script
 * Rows are tagged with title/notes prefix "[LOAD]" so --wipe is precise.
 * Reads .env.local.
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
const U = env.SUPABASE_URL.trim();
const h = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
  prefer: "return=minimal",
};
const mode = process.argv[2];
const TAG = "[LOAD]";

const get = (t, q) => fetch(`${U}/rest/v1/${t}?${q}`, { headers: h }).then((r) => r.json());
const ins = (t, rows) =>
  fetch(`${U}/rest/v1/${t}`, { method: "POST", headers: h, body: JSON.stringify(rows) });
const del = (t, q) => fetch(`${U}/rest/v1/${t}?${q}`, { method: "DELETE", headers: h });

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n) => iso(Date.now() - n * 86400000);

async function wipe() {
  for (const t of ["meeting_attendance", "action_items", "meetings", "walks", "society_members", "notifications"]) {
    await del(t, `or=(title.like.${encodeURIComponent(TAG + "*")},description.like.${encodeURIComponent(TAG + "*")},name.like.${encodeURIComponent(TAG + "*")},body.like.${encodeURIComponent(TAG + "*")})`);
  }
  console.log("wiped [LOAD] rows");
}

async function apply() {
  const members = await get("members", "select=id&is_active=eq.true");
  const ids = members.map((m) => m.id);
  const pick = () => ids[Math.floor(Math.random() * ids.length)];

  const meetings = Array.from({ length: 60 }, (_, i) => ({
    title: `${TAG} EC Meeting ${i + 1}`,
    date: daysAgo(700 - i * 11),
    status: "Published",
  }));
  await ins("meetings", meetings);
  const mrows = await get("meetings", `select=id&title=like.${encodeURIComponent(TAG + "*")}`);
  const att = [];
  for (const m of mrows)
    for (const id of ids)
      att.push({
        meeting_id: m.id,
        member_id: id,
        status: Math.random() > 0.2 ? "present" : "absent",
        attendance_mode: "in_person",
      });
  for (let i = 0; i < att.length; i += 500) await ins("meeting_attendance", att.slice(i, i + 500));

  const actions = Array.from({ length: 600 }, (_, i) => ({
    title: `${TAG} Action ${i + 1}`,
    assigned_to: pick(),
    status: ["Open", "InProgress", "Done", "Dropped"][i % 4],
    priority: "Normal",
    due_date: daysAgo(300 - (i % 300)),
  }));
  for (let i = 0; i < actions.length; i += 200) await ins("action_items", actions.slice(i, i + 200));

  const walks = Array.from({ length: 200 }, (_, i) => ({
    title: `${TAG} Walk ${i + 1}`,
    location: "Site",
    date: daysAgo(700 - i * 3),
    type: "Local",
  }));
  for (let i = 0; i < walks.length; i += 200) await ins("walks", walks.slice(i, i + 200));

  const SOCIETY_N = Number(process.env.SOCIETY_N || 3000);
  const society = Array.from({ length: SOCIETY_N }, (_, i) => ({
    name: `${TAG} Member ${i + 1}`,
    email: `load${i}@example.com`,
    phone: `90000${String(i).padStart(5, "0")}`,
    city: ["Hyderabad", "Secunderabad", "Warangal"][i % 3],
    membership_type: ["Annual", "Life", "Student"][i % 3],
    status: ["Active", "Due", "Lapsed", "Life"][i % 4],
  }));
  for (let i = 0; i < society.length; i += 500) await ins("society_members", society.slice(i, i + 500));

  const notifs = Array.from({ length: 2000 }, (_, i) => ({
    member_id: pick(),
    type: "load",
    title: `${TAG} Notification ${i + 1}`,
    body: `${TAG} body`,
  }));
  for (let i = 0; i < notifs.length; i += 500) await ins("notifications", notifs.slice(i, i + 500));

  console.log("inserted: 60 meetings + attendance, 600 actions, 200 walks, 570 society members, 2000 notifications");
}

if (mode === "--wipe") await wipe();
else if (mode === "--apply") await apply();
else console.log("dry run — pass --apply to insert or --wipe to remove [LOAD] rows");
