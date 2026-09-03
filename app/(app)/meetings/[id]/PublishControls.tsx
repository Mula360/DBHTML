"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveMom, publishMom } from "../actions";
import type { MeetingRow, MomRow } from "@/lib/database.types";

export function PublishControls({
  meetingId,
  status,
  momStatus,
  quorumMet,
}: {
  meetingId: string;
  status: MeetingRow["status"];
  momStatus: MomRow["status"] | null;
  quorumMet: boolean | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {status === "MoMDraft" && (
        <button
          className="btn"
          disabled={pending}
          onClick={() => run(() => approveMom(meetingId))}
        >
          Approve minutes &amp; create action items
        </button>
      )}

      {status === "Approved" && momStatus === "Approved" && (
        <>
          {quorumMet === false && (
            <input
              placeholder='Type "PUBLISH ANYWAY" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          )}
          <button
            className="btn"
            disabled={pending}
            onClick={() => run(() => publishMom(meetingId, confirmText))}
          >
            Publish &amp; email all members
          </button>
          {quorumMet === false && (
            <p style={{ fontSize: 12, color: "var(--rag-red-fg)" }}>
              This meeting had no quorum — the published minutes will carry a
              Rule 26 notice.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
