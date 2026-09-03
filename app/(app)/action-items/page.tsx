import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import { dueTone, TONE_CLASS } from "@/lib/actionItems";
import { ACTION_STATUSES, PORTFOLIO_TAGS, prettyPortfolio } from "@/lib/constants";
import type { ActionItemRow, MemberRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface SP {
  assignee?: string;
  status?: string;
  portfolio?: string;
  overdue?: string;
  q?: string;
}

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const supabase = createClient();
  const today = istToday();

  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .order("name");
  const memberName = new Map(
    (members ?? []).map((m) => [m.id, (m as MemberRow).name]),
  );

  const openStatuses: ("Open" | "InProgress")[] = ["Open", "InProgress"];
  let query = supabase.from("action_items").select("*");
  if (searchParams.assignee) query = query.eq("assigned_to", searchParams.assignee);
  if (searchParams.status)
    query = query.eq("status", searchParams.status as ActionItemRow["status"]);
  if (searchParams.portfolio) query = query.eq("portfolio_tag", searchParams.portfolio);
  if (searchParams.overdue === "1")
    query = query.lt("due_date", today).in("status", openStatuses);
  if (searchParams.q) query = query.ilike("title", `%${searchParams.q}%`);

  const { data: rows } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);
  const items = (rows ?? []) as ActionItemRow[];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Action Items</h1>
        <Link className="btn" href="/action-items/new">
          + New item
        </Link>
      </div>

      <form
        className="card"
        style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
      >
        <input name="q" placeholder="Search title…" defaultValue={searchParams.q} />
        <select name="assignee" defaultValue={searchParams.assignee ?? ""}>
          <option value="">Any assignee</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {(m as MemberRow).name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ""}>
          <option value="">Any status</option>
          {ACTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="portfolio" defaultValue={searchParams.portfolio ?? ""}>
          <option value="">Any portfolio</option>
          {PORTFOLIO_TAGS.map((p) => (
            <option key={p} value={p}>
              {prettyPortfolio(p)}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={searchParams.overdue === "1"}
            style={{ width: "auto" }}
          />
          Overdue only
        </label>
        <button className="btn secondary" type="submit">
          Apply
        </button>
      </form>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={th}>Item</th>
              <th style={th}>Assignee</th>
              <th style={th}>Portfolio</th>
              <th style={th}>Due</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const tone = dueTone(i, today);
              return (
                <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>
                    <Link href={`/action-items/${i.id}`}>{i.title}</Link>
                  </td>
                  <td style={td}>{memberName.get(i.assigned_to) ?? "—"}</td>
                  <td style={td}>{i.portfolio_tag ? prettyPortfolio(i.portfolio_tag) : "—"}</td>
                  <td style={td}>
                    <span className={`badge ${TONE_CLASS[tone]}`}>
                      {i.due_date ?? "no date"}
                    </span>
                  </td>
                  <td style={td}>{i.status}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td style={td} colSpan={5}>
                  No matching items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "10px 14px" };
