import Link from "next/link";
import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import { TONE_CLASS } from "@/lib/actionItems";
import { prettyPortfolio } from "@/lib/constants";
import type { ActionItemRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const { member } = await getSessionMember();
  const supabase = createClient();
  const today = istToday();
  const weekEnd = addDays(today, 7);

  const { data: rows } = await supabase
    .from("action_items")
    .select("*")
    .eq("assigned_to", member.id)
    .in("status", ["Open", "InProgress"])
    .order("due_date", { ascending: true, nullsFirst: false });
  const items = (rows ?? []) as ActionItemRow[];

  const groups: { label: string; tone: string; list: ActionItemRow[] }[] = [
    {
      label: "Overdue",
      tone: "rag-red",
      list: items.filter((i) => i.due_date && i.due_date < today),
    },
    {
      label: "Due this week",
      tone: "rag-amber",
      list: items.filter(
        (i) => i.due_date && i.due_date >= today && i.due_date <= weekEnd,
      ),
    },
    {
      label: "Later / no date",
      tone: "",
      list: items.filter((i) => !i.due_date || i.due_date > weekEnd),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <h1>My Tasks</h1>
      <p style={{ color: "#667" }}>
        {items.length} open item{items.length === 1 ? "" : "s"} assigned to you.
      </p>
      {groups.map((g) =>
        g.list.length === 0 ? null : (
          <div key={g.label} className="card">
            <div className={`badge ${g.tone}`} style={{ marginBottom: 8 }}>
              {g.label} · {g.list.length}
            </div>
            {g.list.map((i) => (
              <div
                key={i.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "1px solid var(--line)",
                  fontSize: 14,
                }}
              >
                <Link href={`/action-items/${i.id}`}>{i.title}</Link>
                <span style={{ color: "#667" }}>
                  {i.portfolio_tag ? `${prettyPortfolio(i.portfolio_tag)} · ` : ""}
                  <span className={`badge ${TONE_CLASS[i.due_date && i.due_date < today ? "overdue" : "later"]}`}>
                    {i.due_date ?? "no date"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ),
      )}
      {items.length === 0 && (
        <p className="card" style={{ color: "#889" }}>
          Nothing open. 🎉
        </p>
      )}
    </div>
  );
}
