"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importNotesFromText,
  importNotesFromLink,
  resyncMeeting,
} from "../actions";

export function NotesImport({
  meetingId,
  canManage,
  googleReady,
  notesDocUrl,
  meetSyncedAt,
  meetDurationMinutes,
  notesIngestedAt,
}: {
  meetingId: string;
  canManage: boolean;
  googleReady: boolean;
  notesDocUrl: string | null;
  meetSyncedAt: string | null;
  meetDurationMinutes: number | null;
  notesIngestedAt: string | null;
}) {
  const [tab, setTab] = useState<"link" | "text">(googleReady ? "link" : "text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string; summary?: string }>) => {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg(res.error ?? res.summary ?? "Draft minutes updated.");
      if (!res.error) router.refresh();
    });
  };

  if (!canManage) {
    return (
      <p style={{ fontSize: 13, color: "#889" }}>
        Minutes are drafted from the Google Meet notes by the Secretary or
        President.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 12.5, color: "#667", margin: 0 }}>
        {meetSyncedAt
          ? `Synced from Google Meet ${new Date(meetSyncedAt).toLocaleString()}${
              meetDurationMinutes ? ` · call ran ${meetDurationMinutes} min` : ""
            }.`
          : googleReady
            ? "Not yet synced from Google Meet — the daily job picks it up the morning after the call, or use Re-sync now."
            : "Google Meet auto-sync is not configured. Paste the notes below."}
        {notesIngestedAt ? " Draft minutes have been extracted." : ""}
        {notesDocUrl ? (
          <>
            {" "}
            <a href={notesDocUrl} target="_blank" rel="noreferrer">
              Open notes Doc
            </a>
          </>
        ) : null}
      </p>

      <div style={{ display: "flex", gap: 6 }}>
        {(["link", "text"] as const).map((t) => (
          <button
            key={t}
            className="btn secondary"
            onClick={() => setTab(t)}
            style={{
              padding: "4px 10px",
              background: tab === t ? "var(--brand-primary)" : "#fff",
              color: tab === t ? "#fff" : "var(--ink)",
            }}
          >
            {t === "link" ? "Paste Doc link" : "Paste notes text"}
          </button>
        ))}
      </div>

      {tab === "link" ? (
        <div style={{ display: "grid", gap: 6 }}>
          <input
            placeholder="https://docs.google.com/document/d/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            className="btn"
            disabled={pending || !url.trim()}
            onClick={() => run(() => importNotesFromLink(meetingId, url.trim()))}
          >
            {pending ? "Working…" : "Fetch & extract → Draft"}
          </button>
          {!googleReady && (
            <p style={{ fontSize: 12, color: "#a60" }}>
              Link fetch needs Google credentials set in Settings → Meetings &
              Google Workspace.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <textarea
            rows={6}
            placeholder="Paste the Gemini notes here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn"
            disabled={pending || !text.trim()}
            onClick={() => run(() => importNotesFromText(meetingId, text))}
          >
            {pending ? "Working…" : "Extract → Draft"}
          </button>
        </div>
      )}

      {googleReady && (
        <button
          className="btn secondary"
          style={{ width: "fit-content" }}
          disabled={pending}
          onClick={() => run(() => resyncMeeting(meetingId))}
        >
          Re-sync from Google Meet now
        </button>
      )}

      {msg && <p style={{ fontSize: 13, color: "#667" }}>{msg}</p>}
    </div>
  );
}
