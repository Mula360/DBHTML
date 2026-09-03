"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitClaim, setClaimStatus, type Result } from "./actions";
import type { ExpenseClaimRow } from "@/lib/database.types";

const initial: Result = {};

export function ClaimForm() {
  const [state, action] = useFormState(submitClaim, initial);
  const { pending } = useFormStatus();
  return (
    <form
      action={action}
      className="card"
      style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
    >
      <input name="amount" type="number" step="0.01" placeholder="Amount ₹" required />
      <input name="description" placeholder="What for" />
      <input name="receipt_url" type="url" placeholder="Receipt URL (Drive)" />
      <button className="btn" type="submit" disabled={pending}>
        Submit claim
      </button>
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13, gridColumn: "1/-1" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

const NEXT: Record<ExpenseClaimRow["status"], ExpenseClaimRow["status"][]> = {
  Pending: ["Approved", "Rejected"],
  Approved: ["Settled", "Rejected"],
  Rejected: ["Pending"],
  Settled: [],
};

const STATUS_CLASS: Record<ExpenseClaimRow["status"], string> = {
  Pending: "rag-amber",
  Approved: "",
  Rejected: "rag-red",
  Settled: "rag-green",
};

export function ClaimRow({
  claim,
  isTreasurer,
  mine,
}: {
  claim: {
    id: string;
    member: string;
    amount: number;
    description: string | null;
    receipt_url: string | null;
    status: ExpenseClaimRow["status"];
  };
  isTreasurer: boolean;
  mine: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={c}>
        {claim.member}
        {mine && " (you)"}
      </td>
      <td style={c}>₹{claim.amount}</td>
      <td style={c}>{claim.description ?? "—"}</td>
      <td style={c}>
        {claim.receipt_url ? (
          <a href={claim.receipt_url} target="_blank" rel="noreferrer">
            view
          </a>
        ) : (
          "—"
        )}
      </td>
      <td style={c}>
        <span className={`badge ${STATUS_CLASS[claim.status]}`}>{claim.status}</span>
      </td>
      {isTreasurer && (
        <td style={c}>
          <div style={{ display: "flex", gap: 4 }}>
            {NEXT[claim.status].map((n) => (
              <button
                key={n}
                className="btn secondary"
                style={{ padding: "2px 8px", fontSize: 12 }}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await setClaimStatus(claim.id, n);
                    router.refresh();
                  })
                }
              >
                {n}
              </button>
            ))}
          </div>
        </td>
      )}
    </tr>
  );
}

const c: React.CSSProperties = { padding: "8px 12px" };
