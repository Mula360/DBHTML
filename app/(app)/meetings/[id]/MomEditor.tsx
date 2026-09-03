"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMom } from "../actions";
import type { MomContent } from "@/lib/database.types";

export function MomEditor({
  meetingId,
  members,
  initial,
  readOnly,
}: {
  meetingId: string;
  members: { id: string; name: string }[];
  initial: MomContent;
  readOnly: boolean;
}) {
  const [decisions, setDecisions] = useState(initial.decisions.join("\n"));
  const [announcements, setAnnouncements] = useState(
    initial.announcements.join("\n"),
  );
  const [nextSteps, setNextSteps] = useState(initial.nextSteps.join("\n"));
  const [items, setItems] = useState(
    initial.actionItems.length
      ? initial.actionItems
      : [{ title: "", assignee: null as string | null, due: null as string | null }],
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const lines = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await saveMom(meetingId, {
        decisions: lines(decisions),
        announcements: lines(announcements),
        nextSteps: lines(nextSteps),
        actionItems: items.filter((i) => i.title.trim()),
      });
      setMsg(res.error ?? "Minutes saved as draft.");
      if (!res.error) router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Section label="Decisions (one per line)">
        <textarea
          rows={3}
          value={decisions}
          disabled={readOnly}
          onChange={(e) => setDecisions(e.target.value)}
        />
      </Section>

      <Section label="Action items (staged → created in Action Items on approval)">
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((it, idx) => (
            <div
              key={idx}
              style={{ display: "grid", gap: 6, gridTemplateColumns: "2fr 1fr 1fr auto" }}
            >
              <input
                placeholder="Task"
                value={it.title}
                disabled={readOnly}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <select
                value={it.assignee ?? ""}
                disabled={readOnly}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, i) =>
                      i === idx ? { ...x, assignee: e.target.value || null } : x,
                    ),
                  )
                }
              >
                <option value="">Assignee…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={it.due ?? ""}
                disabled={readOnly}
                onChange={(e) =>
                  setItems((p) =>
                    p.map((x, i) =>
                      i === idx ? { ...x, due: e.target.value || null } : x,
                    ),
                  )
                }
              />
              {!readOnly && (
                <button
                  className="btn secondary"
                  style={{ padding: "4px 10px" }}
                  onClick={() =>
                    setItems((p) => p.filter((_, i) => i !== idx))
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              className="btn secondary"
              style={{ width: "fit-content" }}
              onClick={() =>
                setItems((p) => [...p, { title: "", assignee: null, due: null }])
              }
            >
              + Add action item
            </button>
          )}
        </div>
      </Section>

      <Section label="Announcements (one per line)">
        <textarea
          rows={2}
          value={announcements}
          disabled={readOnly}
          onChange={(e) => setAnnouncements(e.target.value)}
        />
      </Section>
      <Section label="Next steps (one per line)">
        <textarea
          rows={2}
          value={nextSteps}
          disabled={readOnly}
          onChange={(e) => setNextSteps(e.target.value)}
        />
      </Section>

      {!readOnly && (
        <div>
          <button className="btn" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save draft"}
          </button>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: "#667" }}>{msg}</p>}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
