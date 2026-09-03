import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import type { SocietyMemberRow } from "@/lib/database.types";
import { MemberRowControls } from "./ui";

export const dynamic = "force-dynamic";

const STATUSES = ["Active", "Due", "Lapsed", "Life"];

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string };
}) {
  const db = createClient();
  const today = istToday();

  let query = db
    .from("society_members")
    .select("*")
    .eq("is_deleted", false);
  if (searchParams.q)
    query = query.or(
      `name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,membership_number.ilike.%${searchParams.q}%`,
    );
  if (searchParams.status)
    query = query.eq(
      "status",
      searchParams.status as SocietyMemberRow["status"],
    );
  if (searchParams.type) query = query.eq("membership_type", searchParams.type);

  const { data: rows } = await query.order("name").limit(1000);
  const members = (rows ?? []) as SocietyMemberRow[];

  const { data: all } = await db
    .from("society_members")
    .select("status, renewal_due_date")
    .eq("is_deleted", false);
  const counts: Record<string, number> = {};
  let dueSoon = 0;
  for (const m of all ?? []) {
    counts[m.status] = (counts[m.status] ?? 0) + 1;
    if (
      (m.status === "Due" || m.status === "Lapsed") &&
      m.renewal_due_date &&
      m.renewal_due_date <= addDays(today, 30)
    )
      dueSoon++;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Membership Register</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn secondary" href="/membership/export">
            Export CSV
          </Link>
          <Link className="btn" href="/membership/import">
            Import CSV
          </Link>
        </div>
      </div>

      <section className="card" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <span key={s} className="badge">
            {s}: {counts[s] ?? 0}
          </span>
        ))}
        <span className="badge rag-amber">Renewals due ≤30d: {dueSoon}</span>
      </section>

      <form className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input name="q" placeholder="Search name / email / number" defaultValue={searchParams.q} />
        <select name="status" defaultValue={searchParams.status ?? ""}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input name="type" placeholder="Type" defaultValue={searchParams.type} style={{ width: 120 }} />
        <button className="btn secondary" type="submit">
          Filter
        </button>
      </form>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={c}>Name</th>
              <th style={c}>Contact</th>
              <th style={c}>Type</th>
              <th style={c}>Renewal due</th>
              <th style={c}>Status</th>
              <th style={c} />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={c}>{m.name}</td>
                <td style={c}>
                  {m.email ?? ""}
                  {m.phone ? ` · ${m.phone}` : ""}
                </td>
                <td style={c}>{m.membership_type ?? "—"}</td>
                <td style={c}>{m.renewal_due_date ?? "—"}</td>
                <td style={c}>
                  <span
                    className={`badge ${
                      m.status === "Lapsed"
                        ? "rag-red"
                        : m.status === "Due"
                          ? "rag-amber"
                          : "rag-green"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td style={c}>
                  <MemberRowControls id={m.id} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td style={c} colSpan={6}>
                  No members match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#889" }}>
        Showing up to 1000. General members never log in — no payments, no
        emails to them, no self-service (out of scope).
      </p>
    </div>
  );
}

const c: React.CSSProperties = { padding: "8px 12px" };
