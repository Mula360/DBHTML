import Link from "next/link";
import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import { PageHead, SectionLabel, PortfolioTag, Pill } from "@/components/ui";
import type { ActionItemRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const { member } = await getSessionMember();
  const db = createClient();
  const today = istToday();
  const weekEnd = addDays(today, 7);

  const { data: rows } = await db
    .from("action_items")
    .select("*")
    .eq("assigned_to", member.id)
    .in("status", ["Open", "InProgress"])
    .order("due_date", { ascending: true, nullsFirst: false });
  const items = (rows ?? []) as ActionItemRow[];

  const groups = [
    {
      label: "Overdue",
      list: items.filter((i) => i.due_date && i.due_date < today),
      tone: "red" as const,
    },
    {
      label: "Due this week",
      list: items.filter(
        (i) => i.due_date && i.due_date >= today && i.due_date <= weekEnd,
      ),
      tone: "amber" as const,
    },
    {
      label: "Later / no date",
      list: items.filter((i) => !i.due_date || i.due_date > weekEnd),
      tone: "" as const,
    },
  ];

  return (
    <div>
      <PageHead
        title="My Tasks"
        sub={`${items.length} open item${items.length === 1 ? "" : "s"} assigned to you`}
      />

      {items.length === 0 && (
        <div className="card muted" style={{ marginTop: 14 }}>
          Nothing open assigned to you.
        </div>
      )}

      {groups.map((g) =>
        g.list.length === 0 ? null : (
          <div key={g.label}>
            <SectionLabel>
              {g.label} · {g.list.length}
            </SectionLabel>
            <div className="card flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Portfolio</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {g.list.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/action-items/${i.id}`}>{i.title}</Link>
                      </td>
                      <td>
                        <PortfolioTag tag={i.portfolio_tag} />
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            g.tone === "red"
                              ? "var(--r-fg)"
                              : g.tone === "amber"
                                ? "var(--a-fg)"
                                : "var(--ink-soft)",
                        }}
                      >
                        {i.due_date
                          ? new Date(`${i.due_date}T00:00:00Z`).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short" },
                            )
                          : "no date"}
                      </td>
                      <td>
                        <Pill tone={g.tone}>
                          {i.status === "InProgress" ? "In progress" : i.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
