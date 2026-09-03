"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPortfolioUpdate,
  setPortfolioAssignment,
  upsertHbaSeason,
  upsertAwcSite,
} from "./actions";
import type { HbaSeasonRow, AwcSiteRow, MemberRow } from "@/lib/database.types";

export function UpdateLog({
  portfolio,
  updates,
}: {
  portfolio: string;
  updates: { text: string; by: string; at: string }[];
}) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const post = () =>
    start(async () => {
      await addPortfolioUpdate(portfolio, text);
      setText("");
      router.refresh();
    });
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a status update…"
        />
        <button className="btn" disabled={pending || !text.trim()} onClick={post}>
          Post
        </button>
      </div>
      {updates.map((u, i) => (
        <div key={i} style={{ borderTop: "1px solid var(--line)", padding: "6px 0", fontSize: 14 }}>
          {u.text}
          <div style={{ fontSize: 12, color: "#889" }}>
            {u.by} · {new Date(u.at).toLocaleDateString("en-IN")}
          </div>
        </div>
      ))}
      {updates.length === 0 && (
        <p style={{ color: "#889", fontSize: 14 }}>No updates yet.</p>
      )}
    </div>
  );
}

export function AssignmentEditor({
  portfolio,
  members,
  lead,
  support,
  canEdit,
}: {
  portfolio: string;
  members: Pick<MemberRow, "id" | "name">[];
  lead: string | null;
  support: string[];
  canEdit: boolean;
}) {
  const [l, setL] = useState(lead ?? "");
  const [sup, setSup] = useState<string[]>(support);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  if (!canEdit) {
    return (
      <p style={{ fontSize: 14 }}>
        Lead: <b>{lead ? nameOf(lead) : "unassigned"}</b>
        {support.length > 0 && ` · Support: ${support.map(nameOf).join(", ")}`}
      </p>
    );
  }

  const save = () =>
    start(async () => {
      const r = await setPortfolioAssignment(portfolio, l || null, sup);
      setMsg(r.error ?? "Saved.");
      if (!r.error) router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
      <label style={{ display: "grid", gap: 3, fontWeight: 600 }}>
        Lead
        <select value={l} onChange={(e) => setL(e.target.value)}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 3, fontWeight: 600 }}>
        Support (multi-select)
        <select
          multiple
          size={Math.min(6, members.length)}
          value={sup}
          onChange={(e) =>
            setSup(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button className="btn" disabled={pending} onClick={save}>
          Save assignment
        </button>
      </div>
      {msg && <p style={{ color: "#667" }}>{msg}</p>}
    </div>
  );
}

const HBA_STEPS: (keyof HbaSeasonRow)[] = [
  "briefing_done",
  "teams_allocated",
  "data_submitted",
  "pitta_report_done",
];
const HBA_LABELS = ["Briefing done", "Teams allocated", "Data submitted", "Pitta report done"];

export function HbaPanel({ seasons }: { seasons: HbaSeasonRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [newName, setNewName] = useState("");

  const patch = (row: HbaSeasonRow, key: keyof HbaSeasonRow, val: boolean) =>
    start(async () => {
      await upsertHbaSeason({ id: row.id, [key]: val });
      router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {seasons.map((s) => (
        <div key={s.id} className="card" style={{ background: "var(--surface)" }}>
          <b>{s.season_name ?? "Season"}</b>{" "}
          {s.current_pct != null && `· coverage ${s.current_pct}%`}
          <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
            {HBA_STEPS.map((step, i) => (
              <label key={String(step)} style={{ display: "flex", gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  disabled={pending}
                  checked={Boolean(s[step])}
                  onChange={(e) => patch(s, step, e.target.checked)}
                  style={{ width: "auto" }}
                />
                {HBA_LABELS[i]}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New season name"
        />
        <button
          className="btn"
          disabled={pending || !newName.trim()}
          onClick={() =>
            start(async () => {
              await upsertHbaSeason({ season_name: newName.trim() });
              setNewName("");
              router.refresh();
            })
          }
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function AwcPanel({ sites }: { sites: AwcSiteRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState({ year: new Date().getFullYear(), site_name: "" });

  const patch = (row: AwcSiteRow, key: keyof AwcSiteRow, val: boolean) =>
    start(async () => {
      await upsertAwcSite({ id: row.id, [key]: val });
      router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {sites.map((s) => (
        <div key={s.id} className="card" style={{ background: "var(--surface)", fontSize: 14 }}>
          <b>{s.site_name}</b> · {s.year}
          {s.assigned_team ? ` · ${s.assigned_team}` : ""}
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            <label style={{ display: "flex", gap: 6 }}>
              <input
                type="checkbox"
                disabled={pending}
                checked={Boolean(s.count_done)}
                onChange={(e) => patch(s, "count_done", e.target.checked)}
                style={{ width: "auto" }}
              />
              Count done
            </label>
            <label style={{ display: "flex", gap: 6 }}>
              <input
                type="checkbox"
                disabled={pending}
                checked={Boolean(s.submitted_wi)}
                onChange={(e) => patch(s, "submitted_wi", e.target.checked)}
                style={{ width: "auto" }}
              />
              Submitted to Wetlands International
            </label>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          value={form.year}
          onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
          style={{ width: 90 }}
        />
        <input
          value={form.site_name}
          onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
          placeholder="Site name"
        />
        <button
          className="btn"
          disabled={pending || !form.site_name.trim()}
          onClick={() =>
            start(async () => {
              await upsertAwcSite({ year: form.year, site_name: form.site_name.trim() });
              setForm((f) => ({ ...f, site_name: "" }));
              router.refresh();
            })
          }
        >
          Add site
        </button>
      </div>
    </div>
  );
}
