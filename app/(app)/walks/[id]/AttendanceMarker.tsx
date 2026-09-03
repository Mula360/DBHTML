"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendance } from "../actions";
import type { MemberRow } from "@/lib/database.types";

export function AttendanceMarker({
  walkId,
  members,
  attended,
}: {
  walkId: string;
  members: Pick<MemberRow, "id" | "name">[];
  attended: string[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(attended));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await markAttendance(
        walkId,
        members.map((m) => ({
          member_id: m.id,
          actually_attended: sel.has(m.id),
        })),
      );
      setMsg(res.error ?? "Saved.");
      if (!res.error) router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 4 }}>
        {members.map((m) => (
          <label
            key={m.id}
            style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={sel.has(m.id)}
              onChange={() => toggle(m.id)}
              style={{ width: "auto" }}
            />
            {m.name}
          </label>
        ))}
      </div>
      <div>
        <button className="btn" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save attendance"}
        </button>
      </div>
      {msg && <p style={{ fontSize: 13, color: "#667" }}>{msg}</p>}
    </div>
  );
}
