"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceStatus } from "../actions";
import type { MeetingRow } from "@/lib/database.types";

export function StatusFlow({
  meetingId,
  options,
}: {
  meetingId: string;
  options: MeetingRow["status"][];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (options.length === 0) return null;

  const go = (next: MeetingRow["status"]) => {
    setError(null);
    start(async () => {
      const res = await advanceStatus(meetingId, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o}
            className="btn secondary"
            disabled={pending}
            onClick={() => go(o)}
          >
            {o === "AgendaSent"
              ? "Send agenda to all members"
              : o === "Draft"
                ? "Back to draft"
                : `→ ${o}`}
          </button>
        ))}
      </div>
      {error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
