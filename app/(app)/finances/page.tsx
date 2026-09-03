import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { PageHead, SectionLabel } from "@/components/ui";
import { ClaimForm, ClaimRow } from "./ui";
import type {
  ExpenseClaimRow,
  MemberRow,
  PositionName,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const TREASURER: PositionName[] = ["Treasurer"];

export default async function FinancesPage() {
  const db = createClient();
  const { member, position } = await getSessionMember();
  const isTreasurer = hasPosition(position, TREASURER);

  const { data: claims } = await db
    .from("expense_claims")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: members } = await db.from("members").select("id, name");
  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );

  const rows = (claims ?? []) as ExpenseClaimRow[];
  const pending = rows.filter((r) => r.status === "Pending");
  const totals = (s: ExpenseClaimRow["status"]) =>
    rows.filter((r) => r.status === s).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <div>
      <PageHead
        title="Expense Claims"
        sub="Submit a claim with a Drive receipt link; the Treasurer approves, rejects and settles. The Society's audited accounts remain the system of record — there is no ledger here."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        {(
          [
            ["Pending", totals("Pending"), "var(--a-fg)"],
            ["Approved", totals("Approved"), "var(--blue)"],
            ["Settled", totals("Settled"), "var(--g-fg)"],
            ["Rejected", totals("Rejected"), "var(--r-fg)"],
          ] as const
        ).map(([label, amt, color]) => (
          <div key={label} className="card">
            <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{label}</div>
            <div style={{ font: "700 22px var(--font-ui)", color, marginTop: 7 }}>
              ₹{amt.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Submit a claim</SectionLabel>
      <ClaimForm />

      {isTreasurer && pending.length > 0 && (
        <div className="banner amber" style={{ marginTop: 14 }}>
          <b>{pending.length} claim(s) awaiting your action.</b>
        </div>
      )}

      <SectionLabel>All claims · most recent first</SectionLabel>
      <div className="card flush tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Receipt</th>
              <th>Status</th>
              {isTreasurer && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ClaimRow
                key={r.id}
                claim={{
                  id: r.id,
                  member: nameOf.get(r.member_id) ?? "—",
                  amount: r.amount,
                  description: r.description,
                  receipt_url: r.receipt_url,
                  status: r.status,
                }}
                isTreasurer={isTreasurer}
                mine={r.member_id === member.id}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isTreasurer ? 6 : 5} className="muted">
                  No claims yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
