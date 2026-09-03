import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAllObligations, getCurrentConfig } from "@/lib/compliance-compute";
import { getComplianceYear } from "@/lib/compliance";
import { istToday } from "@/lib/dates";
import { PrintButton } from "../../PrintButton";
import type {
  MemberRow,
  ActionItemRow,
  PittaContributionRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";
const RAG = { green: "rag-green", amber: "rag-amber", red: "rag-red" } as const;

export default async function MemberReport({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();
  const { data: member } = await db
    .from("members")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!member) notFound();
  const m = member as MemberRow;

  const config = await getCurrentConfig(db);
  const today = istToday();
  const year = config ? getComplianceYear(today, config) : null;
  const obligations = config
    ? (await computeAllObligations(db, config)).find(
        (r) => r.member.id === params.id,
      )
    : null;

  const [{ data: items }, { data: coord }, { data: att }, { data: pitta }] =
    await Promise.all([
      db.from("action_items").select("*").eq("assigned_to", params.id),
      db.from("walk_coordinators").select("id").eq("member_id", params.id),
      db
        .from("walk_attendance")
        .select("actually_attended")
        .eq("member_id", params.id),
      db
        .from("pitta_contributions")
        .select("*")
        .eq("member_id", params.id)
        .order("submitted_at", { ascending: false }),
    ]);

  const ai = (items ?? []) as ActionItemRow[];
  const done = ai.filter((i) => i.status === "Done").length;
  const open = ai.filter((i) => i.status === "Open" || i.status === "InProgress").length;
  const overdue = ai.filter(
    (i) => (i.status === "Open" || i.status === "InProgress") && i.due_date && i.due_date < today,
  ).length;
  const attended = (att ?? []).filter((a) => a.actually_attended).length;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 640 }} className="printable">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>{m.name} — annual report</h1>
        <Link href="/reports" className="no-print" style={{ fontSize: 13 }}>
          ← Reports
        </Link>
      </div>
      {year && (
        <p style={{ color: "#667" }}>
          Compliance year {year.label} ({year.start} → {year.end})
        </p>
      )}

      {obligations && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Baseline obligations</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {obligations.obligations.map((o) => (
              <div key={o.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>{o.label}</span>
                <span className={`badge ${RAG[o.rag]}`}>
                  {o.achieved} / {o.minimum}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Action items</h3>
        <p style={{ fontSize: 14 }}>
          {done} completed · {open} open · {overdue} overdue ·{" "}
          {ai.length ? Math.round((done / ai.length) * 100) : 0}% completion rate
        </p>
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Walks</h3>
        <p style={{ fontSize: 14 }}>
          {(coord ?? []).length} coordinated · {attended} attended
        </p>
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Pitta contributions</h3>
        {((pitta ?? []) as PittaContributionRow[]).map((p) => (
          <div key={p.id} style={{ fontSize: 14, padding: "3px 0" }}>
            {p.submitted_at} — {p.contribution_title}
          </div>
        ))}
        {(pitta ?? []).length === 0 && (
          <p style={{ color: "#889", fontSize: 14 }}>None on record.</p>
        )}
      </section>

      <PrintButton />
    </div>
  );
}
