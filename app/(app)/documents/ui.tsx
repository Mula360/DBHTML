"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDocument, deleteDocument, type Result } from "./actions";
import type { DocumentRow } from "@/lib/database.types";

const initial: Result = {};
const CATEGORIES = [
  "ByeLaws",
  "MoMArchive",
  "Finance",
  "HBA",
  "AWC",
  "Handover",
  "Other",
];

export function AddDocForm() {
  const [state, action] = useFormState(addDocument, initial);
  const { pending } = useFormStatus();
  return (
    <form
      action={action}
      className="card"
      style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}
    >
      <input name="title" placeholder="Title" required />
      <input name="url" type="url" placeholder="URL (Drive, web…)" required />
      <select name="category" defaultValue="Other">
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <button className="btn" type="submit" disabled={pending}>
        Add document
      </button>
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13, gridColumn: "1/-1" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

export function DocList({
  docs,
  canDelete,
}: {
  docs: DocumentRow[];
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {docs.map((d) => (
        <div
          key={d.id}
          style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}
        >
          <a href={d.url} target="_blank" rel="noreferrer">
            {d.title}
          </a>
          {canDelete && (
            <button
              className="btn secondary"
              style={{ padding: "2px 8px", fontSize: 12 }}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteDocument(d.id);
                  router.refresh();
                })
              }
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
