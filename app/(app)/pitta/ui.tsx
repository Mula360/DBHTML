"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createIssue,
  setIssueStatus,
  upsertContribution,
  publishIssue,
  type Result,
} from "./actions";
import type { PittaIssueRow } from "@/lib/database.types";

const initial: Result = {};
const STATUSES: PittaIssueRow["status"][] = [
  "Planning",
  "Writing",
  "Layout",
  "Published",
];

export function NewIssueForm() {
  const [state, action] = useFormState(createIssue, initial);
  const { pending } = useFormStatus();
  return (
    <form
      action={action}
      className="card"
      style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}
    >
      <input name="issue_number" placeholder="Issue no. (e.g. 44)" />
      <input name="theme" placeholder="Theme" />
      <input name="target_publish_date" type="date" />
      <button className="btn" type="submit" disabled={pending}>
        New issue
      </button>
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13, gridColumn: "1/-1" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

export function IssueControls({
  issueId,
  status,
  canEdit,
}: {
  issueId: string;
  status: PittaIssueRow["status"];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  if (!canEdit) return <span className="badge">{status}</span>;

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.error) setErr(r.error);
      else router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {STATUSES.filter((s) => s !== "Published").map((s) => (
          <button
            key={s}
            className={s === status ? "btn" : "btn secondary"}
            style={{ padding: "4px 10px", fontSize: 13 }}
            disabled={pending}
            onClick={() => run(() => setIssueStatus(issueId, s))}
          >
            {s}
          </button>
        ))}
        <button
          className={status === "Published" ? "btn" : "btn secondary"}
          style={{ padding: "4px 10px", fontSize: 13 }}
          disabled={pending || status === "Published"}
          onClick={() => run(() => publishIssue(issueId))}
        >
          Publish
        </button>
      </div>
      {err && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {err}
        </p>
      )}
    </div>
  );
}

export function ContributionRow({
  issueId,
  memberId,
  name,
  initialTitle,
  canEdit,
}: {
  issueId: string;
  memberId: string;
  name: string;
  initialTitle: string;
  canEdit: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const save = () =>
    start(async () => {
      await upsertContribution(issueId, memberId, title);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });

  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <td style={{ padding: "8px 10px" }}>{name}</td>
      <td style={{ padding: "8px 10px" }}>
        {canEdit ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            placeholder="Contribution title (blank = none)"
          />
        ) : (
          title || <span style={{ color: "#889" }}>—</span>
        )}
      </td>
      <td style={{ padding: "8px 10px", width: 90 }}>
        {pending ? "…" : saved ? "saved" : title ? "✓" : ""}
      </td>
    </tr>
  );
}
