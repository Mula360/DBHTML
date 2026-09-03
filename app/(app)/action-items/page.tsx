import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { istToday } from "@/lib/dates";
import { PortfolioTag } from "@/components/ui";
import type { ActionItemRow, MemberRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface SP {
  assignee?: string;
  portfolio?: string;
  overdue?: string;
  mine?: string;
}

const COLS: { key: ActionItemRow["status"]; label: string; accent: string }[] = [
  { key: "Open", label: "OPEN", accent: "#8A98A2" },
  { key: "InProgress", label: "IN PROGRESS", accent: "#E67E22" },
  { key: "Done", label: "DONE", accent: "#00A860" },
  { key: "Dropped", label: "DROPPED", accent: "#B9C4CC" },
];
const PRI: Record<string, { bg: string; fg: string }> = {
  High: { bg: "#FBEAE7", fg: "#A32D1F" },
  Normal: { bg: "#EEF3F7", fg: "#4A5A66" },
  Low: { bg: "#EEF3F7", fg: "#8A98A2" },
};

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const db = createClient();
  const { member } = await getSessionMember();
  const today = istToday();

  const { data: members } = await db.from("members").select("id, name").order("name");
  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );

  let q = db.from("action_items").select("*");
  if (searchParams.assignee) q = q.eq("assigned_to", searchParams.assignee);
  if (searchParams.mine === "1") q = q.eq("assigned_to", member.id);
  if (searchParams.portfolio) q = q.eq("portfolio_tag", searchParams.portfolio);
  if (searchParams.overdue === "1")
    q = q.lt("due_date", today).in("status", ["Open", "InProgress"]);
  const { data: rows } = await q
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(400);
  const items = (rows ?? []) as ActionItemRow[];

  const { count: overdueCount } = await db
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["Open", "InProgress"])
    .not("due_date", "is", null)
    .lt("due_date", today);

  const byCol = (s: ActionItemRow["status"]) => items.filter((i) => i.status === s);

  const chip = (
    label: string,
    href: string,
    active: boolean,
    tone?: "red",
  ) => (
    <Link
      href={href}
      style={{
        padding: "7px 12px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 600,
        minHeight: 32,
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        borderColor: active ? "var(--navy)" : "var(--line-soft)",
        background: active
          ? "var(--navy)"
          : tone === "red"
            ? "var(--r-bg)"
            : "#fff",
        color: active ? "#fff" : tone === "red" ? "var(--r-fg)" : "var(--ink-soft)",
      }}
    >
      {label}
    </Link>
  );

  const noFilters = !searchParams.overdue && !searchParams.mine && !searchParams.portfolio;

  return (
    <div>
      <div className="row" style={{ gap: 9 }}>
        <span className="h2" style={{ marginRight: 8 }}>
          All action items
        </span>
        {chip("All EC", "/action-items", noFilters)}
        {chip(
          `Overdue ${overdueCount ?? 0}`,
          "/action-items?overdue=1",
          searchParams.overdue === "1",
          "red",
        )}
        {chip("Assigned to me", "/action-items?mine=1", searchParams.mine === "1")}
        {chip("Pitta", "/action-items?portfolio=Pitta", searchParams.portfolio === "Pitta")}
        <span style={{ flex: 1 }} />
        <Link href="/action-items/new" className="btn sm">
          + New item
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(268px,1fr))",
          gap: 14,
          marginTop: 16,
          alignItems: "start",
        }}
      >
        {COLS.map((col) => {
          const cards = byCol(col.key);
          return (
            <div
              key={col.key}
              style={{
                background: "var(--tint-2)",
                border: "1px solid #e7edf1",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                className="row"
                style={{
                  gap: 8,
                  padding: "12px 14px",
                  borderBottom: "1px solid #e7edf1",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: col.accent,
                  }}
                />
                <span
                  style={{
                    font: "700 10.5px var(--font-ui)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {col.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>
                  {cards.length}
                </span>
              </div>
              <div style={{ padding: 11, display: "flex", flexDirection: "column", gap: 9 }}>
                {cards.map((k) => {
                  const pri = PRI[k.priority] ?? PRI.Normal;
                  const over =
                    k.due_date &&
                    k.due_date < today &&
                    (k.status === "Open" || k.status === "InProgress");
                  return (
                    <Link
                      key={k.id}
                      href={`/action-items/${k.id}`}
                      style={{
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 9,
                        padding: "11px 12px",
                        color: "var(--ink)",
                        display: "block",
                      }}
                    >
                      <div className="row" style={{ gap: 7, marginBottom: 7 }}>
                        <PortfolioTag tag={k.portfolio_tag} />
                        <span style={{ flex: 1 }} />
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: pri.bg,
                            color: pri.fg,
                          }}
                        >
                          {k.priority.toUpperCase()}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          marginBottom: 9,
                        }}
                      >
                        {k.title}
                      </div>
                      <div className="row" style={{ gap: 7 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 600 }}>
                          {nameOf.get(k.assigned_to) ?? "—"}
                        </span>
                        <span style={{ flex: 1 }} />
                        <span
                          style={{
                            fontSize: 11,
                            color: over ? "var(--r-fg)" : "var(--ink-faint)",
                            fontWeight: over ? 700 : 400,
                          }}
                        >
                          {k.due_date
                            ? new Date(`${k.due_date}T00:00:00Z`).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })
                            : "no date"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {cards.length === 0 && (
                  <div className="muted" style={{ fontSize: 12, padding: "4px 2px" }}>
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
