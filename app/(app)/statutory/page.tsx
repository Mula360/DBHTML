import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { istToday, daysBetween } from "@/lib/dates";
import { PageHead, SectionLabel } from "@/components/ui";
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
    <div>
      <PageHead
        title="Statutory Tracker"
        sub="Registrar / IT / Auditor filings and other compliance obligations. The Secretary is reminded 14 days before each due date; completed recurring items clone into next year."
      />

      {canEdit && (
        <div style={{ marginTop: 14 }}>
          <NewStatutoryForm />
        </div>
      )}

      <SectionLabel>All items · soonest first</SectionLabel>
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
