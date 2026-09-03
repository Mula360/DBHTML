import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { istToday, daysBetween } from "@/lib/dates";
import type { PositionName, StatutoryItemRow } from "@/lib/database.types";
import { StatutoryList, NewStatutoryForm } from "./ui";

export const dynamic = "force-dynamic";

const ALLOWED: PositionName[] = ["Secretary", "President", "Treasurer"];

export default async function StatutoryPage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const canEdit = hasPosition(position, ALLOWED);

  const { data: rows } = await db
    .from("statutory_items")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  const items = (rows ?? []) as StatutoryItemRow[];
  const today = istToday();

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 780 }}>
      <h1>Statutory Tracker</h1>
      <p style={{ color: "#667" }}>
        Registrar / IT / Auditor filings and other compliance obligations. The
        Secretary gets a reminder 14 days before each due date.
      </p>

      {canEdit && <NewStatutoryForm />}

      <StatutoryList
        items={items.map((i) => ({
          ...i,
          daysToDue: i.due_date ? daysBetween(today, i.due_date) : null,
        }))}
        canEdit={canEdit}
      />
    </div>
  );
}
