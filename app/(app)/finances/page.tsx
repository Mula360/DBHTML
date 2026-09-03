import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import type {
  ExpenseClaimRow,
  MemberRow,
  PositionName,
} from "@/lib/database.types";
import { ClaimForm, ClaimRow } from "./ui";

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

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <h1>Expense Claims</h1>
      <p style={{ color: "#667" }}>
        Submit a claim with a Drive receipt link; the Treasurer approves,
        rejects and settles. The Society&apos;s audited accounts remain the
        system of record — no ledger here.
      </p>

      <ClaimForm />

      {isTreasurer && pending.length > 0 && (
        <section className="card rag-amber">
          <b>{pending.length} claim(s) awaiting your action.</b>
        </section>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={c}>Member</th>
              <th style={c}>Amount</th>
              <th style={c}>Description</th>
              <th style={c}>Receipt</th>
              <th style={c}>Status</th>
              {isTreasurer && <th style={c} />}
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
                <td style={c} colSpan={isTreasurer ? 6 : 5}>
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

const c: React.CSSProperties = { padding: "8px 12px" };
