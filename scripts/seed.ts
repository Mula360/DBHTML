/**
 * Seeds a hosted Supabase project (term, compliance_config, 10 members +
 * positions, 11 portfolio assignments) from scripts/seed-data.json.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
 *
 * For local dev use `npx supabase db reset` instead — supabase/seed.sql covers
 * the same ground. This script is idempotent: re-running updates in place.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });

const data = JSON.parse(
  readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"),
) as {
  termLabel: string;
  termStart: string;
  termEnd: string;
  members: { position: string; name: string; email: string }[];
};

const PORTFOLIOS: [string, string, string[]][] = [
  ["Website", "Secretary", ["EC1"]],
  ["MemberEngagement", "VP-1", ["EC2"]],
  ["FDCoordination", "President", ["EC3"]],
  ["BirdRace", "VP-2", ["EC4"]],
  ["AnnualDinner", "VP-1", ["EC5"]],
  ["AGM", "Secretary", ["EC1"]],
  ["AWC", "VP-2", ["EC2"]],
  ["HBA", "Secretary", ["EC3", "EC4"]],
  ["IndianRoller", "VP-1", ["EC5"]],
  ["Pitta", "VP-1", ["EC2"]],
  ["NewProject", "President", ["EC4"]],
];

async function main() {
  // Term
  await db.from("terms").update({ is_current: false }).neq("label", data.termLabel);
  const { data: term } = await db
    .from("terms")
    .upsert(
      {
        label: data.termLabel,
        start_date: data.termStart,
        end_date: data.termEnd,
        is_current: true,
      },
      { onConflict: "label" },
    )
    .select()
    .single();
  if (!term) throw new Error("term upsert failed");

  await db
    .from("compliance_config")
    .upsert({ term_id: term.id }, { onConflict: "term_id" });

  // Members + positions
  const byPosition: Record<string, string> = {};
  for (const m of data.members) {
    const { data: member } = await db
      .from("members")
      .upsert(
        { name: m.name, email: m.email.toLowerCase(), is_active: true },
        { onConflict: "email" },
      )
      .select()
      .single();
    if (!member) throw new Error(`member upsert failed: ${m.email}`);
    byPosition[m.position] = member.id;

    // close any stale position, open the seeded one
    await db
      .from("member_positions")
      .delete()
      .eq("member_id", member.id)
      .eq("term_id", term.id);
    await db.from("member_positions").insert({
      member_id: member.id,
      term_id: term.id,
      position: m.position,
      start_date: data.termStart,
    });
  }

  // Portfolios
  await db.from("portfolio_assignments").delete().eq("term_id", term.id);
  for (const [name, lead, support] of PORTFOLIOS) {
    await db.from("portfolio_assignments").insert({
      term_id: term.id,
      portfolio_name: name,
      lead_member_id: byPosition[lead] ?? null,
      support_member_ids: support.map((p) => byPosition[p]).filter(Boolean),
    });
  }

  console.log(`Seeded term ${data.termLabel}: ${data.members.length} members, ${PORTFOLIOS.length} portfolios.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
