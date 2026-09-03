import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTerm } from "@/lib/portfolios";
import { PORTFOLIOS } from "@/app/(app)/nav";
import { PageHead, PortfolioTag, Avatar } from "@/components/ui";
import type {
  MemberRow,
  PortfolioAssignmentRow,
  ActionItemRow,
  PortfolioUpdateRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PortfoliosIndex() {
  const db = createClient();
  const term = await getCurrentTerm(db);

  const [{ data: assigns }, { data: members }, { data: items }, { data: updates }] =
    await Promise.all([
      term
        ? db.from("portfolio_assignments").select("*").eq("term_id", term.id)
        : Promise.resolve({ data: [] }),
      db.from("members").select("id, name"),
      db
        .from("action_items")
        .select("portfolio_tag, status")
        .in("status", ["Open", "InProgress"]),
      db.from("portfolio_updates").select("portfolio_name, created_at"),
    ]);

  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );
  const assignBy = new Map(
    ((assigns ?? []) as PortfolioAssignmentRow[]).map((a) => [a.portfolio_name, a]),
  );
  const openBy = new Map<string, number>();
  for (const i of (items ?? []) as Pick<ActionItemRow, "portfolio_tag" | "status">[])
    if (i.portfolio_tag)
      openBy.set(i.portfolio_tag, (openBy.get(i.portfolio_tag) ?? 0) + 1);
  const lastBy = new Map<string, string>();
  for (const u of (updates ?? []) as Pick<PortfolioUpdateRow, "portfolio_name" | "created_at">[]) {
    const cur = lastBy.get(u.portfolio_name);
    if (!cur || u.created_at > cur) lastBy.set(u.portfolio_name, u.created_at);
  }

  return (
    <div className="stack">
      <PageHead title="Portfolios" sub={`${term?.label ?? "current term"} — lead, open items and last update`} />

      <div className="card flush tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Portfolio</th>
              <th>Lead</th>
              <th>Support</th>
              <th>Open items</th>
              <th>Last update</th>
            </tr>
          </thead>
          <tbody>
            {PORTFOLIOS.map((p) => {
              const a = assignBy.get(p);
              return (
                <tr key={p}>
                  <td>
                    <Link href={`/portfolios/${p}`}>
                      <PortfolioTag tag={p} />
                    </Link>
                  </td>
                  <td>
                    {a?.lead_member_id ? (
                      <span className="row" style={{ gap: 6 }}>
                        <Avatar name={nameOf.get(a.lead_member_id) ?? "?"} size={22} />
                        {nameOf.get(a.lead_member_id)}
                      </span>
                    ) : (
                      <span className="faint">unassigned</span>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {(a?.support_member_ids ?? [])
                      .map((id) => nameOf.get(id))
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>{openBy.get(p) ?? 0}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {lastBy.get(p)
                      ? new Date(lastBy.get(p)!).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
