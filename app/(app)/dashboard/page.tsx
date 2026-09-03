import Link from "next/link";
import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import { computeAllObligations, getCurrentConfig } from "@/lib/compliance-compute";
import type { ActionItemRow } from "@/lib/database.types";

const RAG_CLASS = { green: "rag-green", amber: "rag-amber", red: "rag-red" } as const;

async function MyObligations({ memberId }: { memberId: string }) {
  const db = createClient();
  const config = await getCurrentConfig(db);
  if (!config) return null;
  const rows = await computeAllObligations(db, config);
  const mine = rows.find((r) => r.member.id === memberId);
  if (!mine) return null;
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ marginBottom: 8 }}>My baseline obligations</h3>
        <Link href="/compliance" style={{ fontSize: 13 }}>
          Full tracker →
        </Link>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {mine.obligations.map((o) => (
          <span key={o.key} className={`badge ${RAG_CLASS[o.rag]}`}>
            {o.label}: {o.achieved}/{o.minimum}
          </span>
        ))}
      </div>
    </section>
  );
}

export const dynamic = "force-dynamic";

function groupItems(items: ActionItemRow[], today: string) {
  const weekEnd = addDays(today, 7);
  const open = items.filter((i) => i.status === "Open" || i.status === "InProgress");
  return {
    overdue: open.filter((i) => i.due_date && i.due_date < today),
    dueThisWeek: open.filter(
      (i) => i.due_date && i.due_date >= today && i.due_date <= weekEnd,
    ),
    upcoming: open.filter((i) => !i.due_date || i.due_date > weekEnd),
  };
}

async function TreasurerWidget() {
  const db = createClient();
  const { count } = await db
    .from("expense_claims")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending");
  return (
    <section className={`card ${count ? "rag-amber" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>Expense claims</h3>
        <Link href="/finances" style={{ fontSize: 13 }}>
          Open →
        </Link>
      </div>
      <p style={{ fontSize: 14, marginTop: 4 }}>
        {count ?? 0} claim(s) awaiting your action.
      </p>
    </section>
  );
}

export default async function DashboardPage() {
  const { member, position } = await getSessionMember();
  const supabase = createClient();
  const today = istToday();

  const { data: items } = await supabase
    .from("action_items")
    .select("*")
    .eq("assigned_to", member.id)
    .in("status", ["Open", "InProgress"]);
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, date, time")
    .gte("date", today)
    .order("date")
    .limit(3);
  const { data: walks } = await supabase
    .from("walks")
    .select("id, title, location, date")
    .gte("date", today)
    .order("date")
    .limit(3);

  const g = groupItems((items ?? []) as ActionItemRow[], today);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h1>Hello, {member.name.split(" ")[0]}</h1>
        <p style={{ color: "#667" }}>
          You are <b>{position ?? "not on the current EC"}</b> · EC year{" "}
          {new Date().getFullYear()}
        </p>
      </div>

      <section className="card">
        <h3 style={{ marginBottom: 10 }}>My open action items</h3>
        <ItemGroup title="Overdue" items={g.overdue} tone="rag-red" />
        <ItemGroup title="Due this week" items={g.dueThisWeek} tone="rag-amber" />
        <ItemGroup title="Upcoming" items={g.upcoming} tone="" />
        {(items ?? []).length === 0 && (
          <p style={{ color: "#889", fontSize: 14 }}>Nothing assigned to you.</p>
        )}
      </section>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        <section className="card">
          <h3 style={{ marginBottom: 10 }}>Upcoming meetings</h3>
          {(meetings ?? []).length === 0 && <Empty />}
          {(meetings ?? []).map((m) => (
            <div key={m.id} style={row}>
              <span>{m.title}</span>
              <span style={{ color: "#667" }}>
                {m.date} {m.time ?? ""}
              </span>
            </div>
          ))}
        </section>
        <section className="card">
          <h3 style={{ marginBottom: 10 }}>Upcoming walks</h3>
          {(walks ?? []).length === 0 && <Empty />}
          {(walks ?? []).map((w) => (
            <div key={w.id} style={row}>
              <span>{w.title}</span>
              <span style={{ color: "#667" }}>{w.date}</span>
            </div>
          ))}
        </section>
      </div>

      <MyObligations memberId={member.id} />
      {position === "Treasurer" && <TreasurerWidget />}
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "7px 0",
  borderBottom: "1px solid var(--line)",
  fontSize: 14,
};

function Empty() {
  return <p style={{ color: "#889", fontSize: 14 }}>Nothing scheduled.</p>;
}

function ItemGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: ActionItemRow[];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        className={`badge ${tone}`}
        style={{ marginBottom: 6 }}
      >
        {title} · {items.length}
      </div>
      {items.map((i) => (
        <div key={i.id} style={row}>
          <span>{i.title}</span>
          <span style={{ color: "#667" }}>{i.due_date ?? "no date"}</span>
        </div>
      ))}
    </div>
  );
}
