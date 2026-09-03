"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAgmChecklist } from "../actions";
import type { AgmChecklistRow } from "@/lib/database.types";

const CHECKS: { key: keyof AgmChecklistRow; label: string }[] = [
  { key: "venue_named_in_notice", label: "Venue named in the notice" },
  { key: "post_agm_filings_done", label: "Post-AGM Registrar filings done" },
];
const DATES: { key: keyof AgmChecklistRow; label: string }[] = [
  { key: "notice_sent_date", label: "Notice sent on" },
  { key: "nominations_open", label: "Nominations open" },
  { key: "nominations_close", label: "Nominations close" },
];

export function AgmChecklistPanel({
  eventId,
  initial,
  readOnly,
}: {
  eventId: string;
  initial: AgmChecklistRow;
  readOnly: boolean;
}) {
  const [row, setRow] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await updateAgmChecklist(eventId, {
        venue_named_in_notice: row.venue_named_in_notice,
        post_agm_filings_done: row.post_agm_filings_done,
        notice_sent_date: row.notice_sent_date || null,
        nominations_open: row.nominations_open || null,
        nominations_close: row.nominations_close || null,
        quorum_required: row.quorum_required,
      });
      setMsg(res.error ?? "Saved.");
      if (!res.error) router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {CHECKS.map((c) => (
        <label
          key={String(c.key)}
          style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}
        >
          <input
            type="checkbox"
            disabled={readOnly}
            checked={Boolean(row[c.key])}
            onChange={(e) =>
              setRow((p) => ({ ...p, [c.key]: e.target.checked }))
            }
            style={{ width: "auto" }}
          />
          {c.label}
        </label>
      ))}
      {DATES.map((d) => (
        <label
          key={String(d.key)}
          style={{ display: "grid", gap: 3, fontSize: 12, fontWeight: 600 }}
        >
          {d.label}
          <input
            type="date"
            disabled={readOnly}
            value={(row[d.key] as string) ?? ""}
            onChange={(e) =>
              setRow((p) => ({ ...p, [d.key]: e.target.value }))
            }
          />
        </label>
      ))}
      <label style={{ display: "grid", gap: 3, fontSize: 12, fontWeight: 600 }}>
        AGM quorum required (Rule 26)
        <input
          type="number"
          disabled={readOnly}
          value={row.quorum_required}
          onChange={(e) =>
            setRow((p) => ({ ...p, quorum_required: Number(e.target.value) }))
          }
        />
      </label>
      {!readOnly && (
        <div>
          <button className="btn" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save checklist"}
          </button>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: "#667" }}>{msg}</p>}
    </div>
  );
}
