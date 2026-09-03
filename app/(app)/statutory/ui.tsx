"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStatutoryItem,
  setStatutoryStatus,
  deleteStatutoryItem,
  type Result,
} from "./actions";
import type { StatutoryItemRow } from "@/lib/database.types";

const initial: Result = {};
const STATUSES: StatutoryItemRow["status"][] = ["Pending", "InProgress", "Done"];

function Save() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add item"}
    </button>
  );
}

export function NewStatutoryForm() {
  const [state, action] = useFormState(createStatutoryItem, initial);
  return (
    <form
      action={action}
      className="card"
      style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}
    >
      <input name="title" placeholder="Title" required />
      <input name="authority" placeholder="Authority (Registrar / IT / Auditor)" />
      <input name="due_date" type="date" />
      <input name="document_url" type="url" placeholder="Document URL (Drive)" />
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" name="recurring_yearly" style={{ width: "auto" }} />
        Recurring yearly
      </label>
      <Save />
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13, gridColumn: "1 / -1" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

type Item = StatutoryItemRow & { daysToDue: number | null };

export function StatutoryList({
  items,
  canEdit,
}: {
  items: Item[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  if (items.length === 0)
    return <p className="card" style={{ color: "#889" }}>No statutory items yet.</p>;

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#667" }}>
            <th style={c}>Item</th>
            <th style={c}>Authority</th>
            <th style={c}>Due</th>
            <th style={c}>Status</th>
            {canEdit && <th style={c} />}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const overdue =
              i.daysToDue !== null && i.daysToDue < 0 && i.status !== "Done";
            const soon =
              i.daysToDue !== null && i.daysToDue >= 0 && i.daysToDue <= 14;
            return (
              <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={c}>
                  {i.document_url ? (
                    <a href={i.document_url} target="_blank" rel="noreferrer">
                      {i.title}
                    </a>
                  ) : (
                    i.title
                  )}
                  {i.recurring_yearly && (
                    <span className="badge" style={{ marginLeft: 6 }}>
                      yearly
                    </span>
                  )}
                </td>
                <td style={c}>{i.authority ?? "—"}</td>
                <td style={c}>
                  <span
                    className={`badge ${
                      overdue ? "rag-red" : soon ? "rag-amber" : ""
                    }`}
                  >
                    {i.due_date ?? "no date"}
                  </span>
                </td>
                <td style={c}>
                  {canEdit ? (
                    <select
                      value={i.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          setStatutoryStatus(
                            i.id,
                            e.target.value as StatutoryItemRow["status"],
                          ),
                        )
                      }
                      style={{ width: "auto" }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    i.status
                  )}
                </td>
                {canEdit && (
                  <td style={c}>
                    <button
                      className="btn secondary"
                      style={{ padding: "3px 8px", fontSize: 12 }}
                      disabled={pending}
                      onClick={() => run(() => deleteStatutoryItem(i.id))}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const c: React.CSSProperties = { padding: "9px 12px" };
