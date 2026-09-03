"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateBot } from "../actions";

export function BotControls({
  meetingId,
  botId,
  hasTranscript,
}: {
  meetingId: string;
  botId: string | null;
  hasTranscript: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const chip = hasTranscript
    ? { label: "Transcript received", cls: "rag-green" }
    : botId
      ? { label: "Bot scheduled", cls: "rag-amber" }
      : { label: "No bot", cls: "" };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <span className={`badge ${chip.cls}`}>{chip.label}</span>
      </div>
      {!botId && (
        <button
          className="btn secondary"
          style={{ width: "fit-content" }}
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await activateBot(meetingId);
              if (r.error) setError(r.error);
              else router.refresh();
            });
          }}
        >
          Activate meeting bot
        </button>
      )}
      <p style={{ fontSize: 12, color: "#889" }}>
        The bot records the call. Tell participants at the start that the meeting
        is being recorded and transcribed by the Deccan Birders Assistant. The
        draft minutes are pre-filled from the transcript — the Secretary edits
        and approves; nothing is emailed automatically.
      </p>
      {error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
