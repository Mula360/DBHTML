import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays } from "@/lib/dates";
import { PageHead } from "@/components/ui";
import type { SocietyMemberRow } from "@/lib/database.types";
import { MemberRowControls } from "./ui";

export const dynamic = "force-dynamic";

const STATUSES = ["Active", "Due", "Lapsed", "Life"];

const PAGE_SIZE = 50;

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string; page?: string };
}) {
  const db = createClient();
  const today = istToday();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = db
    .from("society_members")
    .select("*", { count: "exact" })
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

  const { data: rows, count: total } = await query
    .order("name")
    .range(from, from + PAGE_SIZE - 1);
  const members = (rows ?? []) as SocietyMemberRow[];
  const totalCount = total ?? members.length;
  const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Status tiles + "due soon" — SQL-side counts, never a full-table fetch.
  const base = () =>
    db
      .from("society_members")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false);
  const [active, due, lapsed, life, dueSoonRes] = await Promise.all([
    base().eq("status", "Active"),
    base().eq("status", "Due"),
    base().eq("status", "Lapsed"),
    base().eq("status", "Life"),
    base()
      .in("status", ["Due", "Lapsed"])
      .not("renewal_due_date", "is", null)
      .lte("renewal_due_date", addDays(today, 30)),
  ]);
  const counts: Record<string, number> = {
    Active: active.count ?? 0,
    Due: due.count ?? 0,
    Lapsed: lapsed.count ?? 0,
    Life: life.count ?? 0,
  };
  const dueSoon = dueSoonRes.count ?? 0;
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (searchParams.q) u.set("q", searchParams.q);
    if (searchParams.status) u.set("status", searchParams.status);
    if (searchParams.type) u.set("type", searchParams.type);
    u.set("page", String(p));
    return `?${u}`;
  };

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
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 10,
          fontSize: 12,
        }}
      >
        <span className="faint">
          {totalCount.toLocaleString("en-IN")} members · page {page} of {pages}
        </span>
        {page > 1 && (
          <Link className="btn secondary" href={qs(page - 1)}>
            ← Prev
          </Link>
        )}
        {page < pages && (
          <Link className="btn secondary" href={qs(page + 1)}>
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

