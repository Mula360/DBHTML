import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DigestArchive() {
  const db = createClient();
  const { data } = await db
    .from("digest_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Digest archive</h1>
        <Link href="/reports" style={{ fontSize: 13 }}>
          ← Reports
        </Link>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={{ padding: "8px 12px" }}>Sent</th>
              <th style={{ padding: "8px 12px" }}>Type</th>
              <th style={{ padding: "8px 12px" }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => {
              const row = d as {
                id: string;
                type: string | null;
                sent_at: string;
                recipients_json: unknown;
              };
              return (
                <tr key={row.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 12px" }}>
                    {new Date(row.sent_at).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{row.type}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>
                    {JSON.stringify(row.recipients_json)}
                  </td>
                </tr>
              );
            })}
            {(data ?? []).length === 0 && (
              <tr>
                <td style={{ padding: "8px 12px" }} colSpan={3}>
                  No digests sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
