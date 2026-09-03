import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import type { WalkRow, MemberRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function WalksPage() {
  const db = createClient();
  const today = istToday();

  const { data: rows } = await db
    .from("walks")
    .select("*")
    .order("date", { ascending: false });
  const walks = (rows ?? []) as WalkRow[];

  const { data: coords } = await db
    .from("walk_coordinators")
    .select("member_id, walk_id, walks(date)");
  const { data: att } = await db
    .from("walk_attendance")
    .select("member_id, actually_attended, walks(date)");
  const { data: members } = await db.from("members").select("id, name").order("name");

  const coordCount = new Map<string, number>();
  for (const c of coords ?? [])
    coordCount.set(c.member_id, (coordCount.get(c.member_id) ?? 0) + 1);
  const attendCount = new Map<string, number>();
  for (const a of att ?? [])
    if (a.actually_attended)
      attendCount.set(a.member_id, (attendCount.get(a.member_id) ?? 0) + 1);

  const upcoming = walks.filter((w) => w.date >= today).reverse();
  const past = walks.filter((w) => w.date < today);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Walks &amp; Field Trips</h1>
        <Link className="btn" href="/walks/new">
          + New walk
        </Link>
      </div>

      <section className="card">
        <h3 style={{ marginBottom: 10 }}>Upcoming</h3>
        {upcoming.length === 0 && <p style={{ color: "#889" }}>Nothing scheduled.</p>}
        {upcoming.map((w) => (
          <Row key={w.id} w={w} />
        ))}
      </section>

      <section className="card" style={{ padding: 0, overflowX: "auto" }}>
        <h3 style={{ padding: "16px 16px 8px" }}>Archive</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={c}>Date</th>
              <th style={c}>Walk</th>
              <th style={c}>Type</th>
              <th style={c}>eBird</th>
            </tr>
          </thead>
          <tbody>
            {past.map((w) => (
              <tr key={w.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={c}>{w.date}</td>
                <td style={c}>
                  <Link href={`/walks/${w.id}`}>{w.title}</Link> · {w.location}
                </td>
                <td style={c}>{w.type}</td>
                <td style={c}>
                  {w.ebird_list_url ? (
                    <a href={w.ebird_list_url} target="_blank" rel="noreferrer">
                      list
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {past.length === 0 && (
              <tr>
                <td style={c} colSpan={4}>
                  No past walks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ padding: 0, overflowX: "auto" }}>
        <h3 style={{ padding: "16px 16px 8px" }}>Per-member tallies (all time)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={c}>Member</th>
              <th style={c}>Coordinated</th>
              <th style={c}>Attended</th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={c}>{(m as MemberRow).name}</td>
                <td style={c}>{coordCount.get(m.id) ?? 0}</td>
                <td style={c}>{attendCount.get(m.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Row({ w }: { w: WalkRow }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderTop: "1px solid var(--line)",
        fontSize: 14,
      }}
    >
      <Link href={`/walks/${w.id}`}>
        {w.title} · {w.location}
      </Link>
      <span style={{ color: "#667" }}>
        {w.date}
        {w.meet_time ? ` · ${w.meet_time}` : ""}
      </span>
    </div>
  );
}

const c: React.CSSProperties = { padding: "9px 12px" };
