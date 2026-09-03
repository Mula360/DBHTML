import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import { PageHead, SectionLabel, Avatar } from "@/components/ui";
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

  const [{ data: coords }, { data: att }, { data: members }] = await Promise.all([
    db.from("walk_coordinators").select("walk_id, member_id"),
    db.from("walk_attendance").select("walk_id, member_id, actually_attended"),
    db.from("members").select("id, name").order("name"),
  ]);
  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );
  const coordByWalk = new Map<string, string[]>();
  const coordCount = new Map<string, number>();
  for (const c of coords ?? []) {
    coordByWalk.set(c.walk_id, [...(coordByWalk.get(c.walk_id) ?? []), c.member_id]);
    coordCount.set(c.member_id, (coordCount.get(c.member_id) ?? 0) + 1);
  }
  const attendCount = new Map<string, number>();
  for (const a of att ?? [])
    if (a.actually_attended)
      attendCount.set(a.member_id, (attendCount.get(a.member_id) ?? 0) + 1);

  const upcoming = walks.filter((w) => w.date >= today).reverse();
  const past = walks.filter((w) => w.date < today);
  const next = upcoming[0];

  return (
    <div>
      <PageHead
        title="Walks & Field Trips"
        sub="eBird checklists and Drive photo links are the record — no species entry here."
        actions={
          <Link href="/walks/new" className="btn">
            + New walk
          </Link>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 16,
          marginTop: 16,
          alignItems: "stretch",
        }}
        className="walk-top"
      >
        {next ? (
          <div className="card-navy row" style={{ gap: 24, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow" style={{ color: "#8fb6d6", marginBottom: 8 }}>
                Next walk · RSVP open
              </div>
              <div style={{ font: "400 21px/1.25 Georgia,serif", marginBottom: 5 }}>
                {next.title} · {fmt(next.date)}
              </div>
              <div style={{ fontSize: 12.5, color: "#c7dbea", lineHeight: 1.45 }}>
                {next.meet_time ?? "—"} at {next.meet_point ?? "the meeting point"} ·{" "}
                {next.type.toLowerCase()} · coordinator{" "}
                {(coordByWalk.get(next.id) ?? [])
                  .map((id) => nameOf.get(id))
                  .filter(Boolean)
                  .join(", ") || "TBD"}
              </div>
              <Link
                href={`/walks/${next.id}`}
                className="btn secondary sm"
                style={{ marginTop: 12 }}
              >
                Open walk
              </Link>
            </div>
          </div>
        ) : (
          <div className="card muted">No upcoming walk scheduled.</div>
        )}

        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 11 }}>
            Coordinator tally · feeds obligations
          </div>
          <div className="row" style={{ gap: 8 }}>
            {[...coordCount.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([id, n]) => (
                <span
                  key={id}
                  className="row"
                  style={{
                    gap: 7,
                    padding: "5px 9px 5px 5px",
                    border: "1px solid #e7edf1",
                    borderRadius: 20,
                  }}
                >
                  <Avatar name={nameOf.get(id) ?? "?"} size={22} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{n} coordinated</span>
                </span>
              ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 12, lineHeight: 1.4 }}>
            Coordinating a walk counts toward the field-trip obligation;
            co-coordinators each get full credit.
          </div>
        </div>
      </div>

      <SectionLabel>Walk archive · most recent first</SectionLabel>
      <div className="card flush tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Type</th>
              <th>Coordinators</th>
              <th>eBird</th>
            </tr>
          </thead>
          <tbody>
            {[...upcoming, ...past].map((w) => (
              <tr key={w.id}>
                <td className="muted" style={{ fontSize: 12 }}>
                  {fmt(w.date)}
                </td>
                <td>
                  <Link href={`/walks/${w.id}`} style={{ fontWeight: 600 }}>
                    {w.title}
                  </Link>
                  <div className="faint" style={{ fontSize: 11 }}>
                    {w.location}
                  </div>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {w.type}
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {(coordByWalk.get(w.id) ?? [])
                    .map((id) => nameOf.get(id))
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td>
                  {w.ebird_list_url ? (
                    <a href={w.ebird_list_url} target="_blank" rel="noreferrer">
                      list
                    </a>
                  ) : (
                    <span className="faint">—</span>
                  )}
                </td>
              </tr>
            ))}
            {walks.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No walks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionLabel>Per-member tallies · all time</SectionLabel>
      <div className="card flush tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Coordinated</th>
              <th>Attended</th>
            </tr>
          </thead>
          <tbody>
            {((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="row" style={{ gap: 8 }}>
                    <Avatar name={m.name} size={24} />
                    {m.name}
                  </span>
                </td>
                <td>{coordCount.get(m.id) ?? 0}</td>
                <td>{attendCount.get(m.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
