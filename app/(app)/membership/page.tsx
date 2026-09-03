import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import { PageHead } from "@/components/ui";
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
    <div>
      <PageHead
        title="Membership Register"
        sub="The general membership — who never log in. No payments, emails to them, or self-service (out of scope)."
        actions={
          <>
            <Link className="btn secondary" href="/membership/export">
              Export CSV
            </Link>
            <Link className="btn" href="/membership/import">
              Import CSV
            </Link>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        {STATUSES.map((s) => (
          <div key={s} className="card">
            <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{s}</div>
            <div style={{ font: "700 22px var(--font-ui)", marginTop: 6 }}>
              {counts[s] ?? 0}
            </div>
          </div>
        ))}
        <div className="card">
          <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
            Renewals ≤ 30 days
          </div>
          <div style={{ font: "700 22px var(--font-ui)", color: "var(--a-fg)", marginTop: 6 }}>
            {dueSoon}
          </div>
        </div>
      </div>

      <form className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
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

      <div className="card flush tbl-scroll" style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Renewal due</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {m.email ?? ""}
                  {m.phone ? ` · ${m.phone}` : ""}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {m.membership_type ?? "—"}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {m.renewal_due_date ?? "—"}
                </td>
                <td>
                  <span
                    className={`pill ${
                      m.status === "Lapsed"
                        ? "red"
                        : m.status === "Due"
                          ? "amber"
                          : "green"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td>
                  <MemberRowControls id={m.id} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No members match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
        Showing up to 1000.
      </p>
    </div>
  );
}

