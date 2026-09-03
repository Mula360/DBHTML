"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseCsv } from "@/lib/csv";
import { importMembers, type ImportRow } from "../actions";

const FIELDS: { key: keyof ImportRow; label: string; required?: boolean }[] = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "membership_type", label: "Membership type (Annual/Life/Student)" },
  { key: "membership_number", label: "Membership number" },
  { key: "joined_date", label: "Joined date (YYYY-MM-DD)" },
  { key: "last_renewal_date", label: "Last renewal date" },
  { key: "renewal_due_date", label: "Renewal due date" },
];

function guessColumn(header: string[], field: string): number {
  const f = field.toLowerCase();
  const idx = header.findIndex((h) =>
    h.toLowerCase().replace(/[_\s-]/g, "").includes(f.replace(/[_\s-]/g, "")),
  );
  return idx;
}

export function ImportWizard() {
  const [header, setHeader] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setMsg("CSV needs a header row and at least one data row.");
      return;
    }
    const [head, ...rest] = rows;
    setHeader(head);
    setDataRows(rest);
    const auto: Record<string, number> = {};
    for (const f of FIELDS) {
      const g = guessColumn(head, f.key);
      if (g >= 0) auto[f.key] = g;
    }
    setMapping(auto);
    setMsg(null);
  };

  const build = (): ImportRow[] =>
    dataRows.map((r) => {
      const row: Record<string, string> = {};
      for (const f of FIELDS) {
        const col = mapping[f.key];
        if (col !== undefined && col >= 0) row[f.key] = (r[col] ?? "").trim();
      }
      return row as unknown as ImportRow;
    });

  const preview = build().slice(0, 5);

  const submit = () => {
    setMsg(null);
    start(async () => {
      const res = await importMembers(build());
      setMsg(res.error ?? res.message ?? "Done.");
      if (!res.error) setTimeout(() => router.push("/membership"), 1200);
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {header.length > 0 && (
        <>
          <div className="card" style={{ display: "grid", gap: 8 }}>
            <h3>Map fields</h3>
            {FIELDS.map((f) => (
              <label
                key={f.key}
                style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
              >
                <span style={{ width: 220, fontWeight: 600 }}>
                  {f.label}
                  {f.required && " *"}
                </span>
                <select
                  value={mapping[f.key] ?? -1}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))
                  }
                >
                  <option value={-1}>— none —</option>
                  {header.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <h3 style={{ marginBottom: 8 }}>
              Preview — {dataRows.length} rows total
            </h3>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {FIELDS.map((f) => (
                    <th key={f.key} style={{ padding: 4, textAlign: "left" }}>
                      {f.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    {FIELDS.map((f) => (
                      <td key={f.key} style={{ padding: 4 }}>
                        {r[f.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <button
              className="btn"
              disabled={pending || mapping.name === undefined || mapping.name < 0}
              onClick={submit}
            >
              {pending ? "Importing…" : `Import ${dataRows.length} rows`}
            </button>
          </div>
        </>
      )}

      {msg && (
        <p className="card" style={{ fontSize: 13 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
