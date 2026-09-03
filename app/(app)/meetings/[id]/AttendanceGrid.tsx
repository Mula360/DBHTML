"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAttendance } from "../actions";
import type { MeetingAttendanceRow } from "@/lib/database.types";

type Status = MeetingAttendanceRow["status"];
type Mode = MeetingAttendanceRow["attendance_mode"];

const STATUSES: Status[] = ["present", "absent", "apology"];

export function AttendanceGrid({
  meetingId,
  members,
  initial,
  readOnly,
}: {
  meetingId: string;
  members: { id: string; name: string }[];
  initial: MeetingAttendanceRow[];
  readOnly: boolean;
}) {
  const initialMap = useMemo(() => {
    const map = new Map<string, { status: Status; mode: Mode }>();
    for (const r of initial)
      map.set(r.member_id, { status: r.status, mode: r.attendance_mode });
    return map;
  }, [initial]);

  const [state, setState] = useState<Map<string, { status: Status; mode: Mode }>>(
    () => {
      const m = new Map(initialMap);
      for (const mem of members)
        if (!m.has(mem.id)) m.set(mem.id, { status: "absent", mode: "in_person" });
      return m;
    },
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const set = (id: string, patch: Partial<{ status: Status; mode: Mode }>) => {
    setState((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id)!, ...patch });
      return next;
    });
  };

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await saveAttendance(
        meetingId,
        members.map((mem) => ({
          member_id: mem.id,
          status: state.get(mem.id)!.status,
          attendance_mode: state.get(mem.id)!.mode,
        })),
      );
      setMsg(res.error ?? "Saved. Quorum recalculated.");
      if (!res.error) router.refresh();
    });
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {members.map((mem) => {
              const cur = state.get(mem.id)!;
              return (
                <tr key={mem.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 6px" }}>{mem.name}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {STATUSES.map((sName) => (
                        <button
                          key={sName}
                          disabled={readOnly}
                          onClick={() => set(mem.id, { status: sName })}
                          className="badge"
                          style={{
                            border: "1px solid var(--line)",
                            background:
                              cur.status === sName
                                ? "var(--brand-primary)"
                                : "#fff",
                            color: cur.status === sName ? "#fff" : "var(--ink)",
                            textTransform: "capitalize",
                          }}
                        >
                          {sName}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {cur.status === "present" && (
                      <select
                        disabled={readOnly}
                        value={cur.mode}
                        onChange={(e) =>
                          set(mem.id, { mode: e.target.value as Mode })
                        }
                        style={{ width: "auto" }}
                      >
                        <option value="in_person">In person</option>
                        <option value="virtual">Virtual</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div>
          <button className="btn" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save attendance"}
          </button>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: "#667" }}>{msg}</p>}
    </div>
  );
}
