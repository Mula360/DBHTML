import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import { PageHead, SectionLabel, PortfolioTag } from "@/components/ui";
import type { EventRow, EventHelperRow, MemberRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const STATUS: Record<EventRow["status"], { bg: string; fg: string }> = {
  Planning: { bg: "#EEF3F7", fg: "#4A5A66" },
  Confirmed: { bg: "#EEF5FB", fg: "#1B5A8C" },
  Done: { bg: "#E9F7EF", fg: "#1B7A45" },
};

export default async function EventsPage() {
  const db = createClient();
  const today = istToday();

  const [{ data: rows }, { data: helpers }, { data: members }] = await Promise.all([
    db.from("events").select("*").order("date", { ascending: true, nullsFirst: false }),
    db.from("event_helpers").select("event_id, member_id, confirmed_by_lead"),
    db.from("members").select("id, name"),
  ]);
  const events = (rows ?? []) as EventRow[];
  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );
  const helpBy = new Map<string, EventHelperRow[]>();
  for (const h of (helpers ?? []) as EventHelperRow[])
    helpBy.set(h.event_id, [...(helpBy.get(h.event_id) ?? []), h]);

  const upcoming = events.filter((e) => !e.date || e.date >= today);
  const past = events.filter((e) => e.date && e.date < today);

  const Card = ({ e }: { e: EventRow }) => {
    const hs = helpBy.get(e.id) ?? [];
    const s = STATUS[e.status];
    return (
      <div className="card">
        <div className="row" style={{ gap: 9, marginBottom: 6 }}>
          <Link href={`/events/${e.id}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
            {e.title}
          </Link>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: 5,
              background: s.bg,
              color: s.fg,
            }}
          >
            {e.status.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>
          <PortfolioTag tag={e.type} /> · {e.date ?? "no date"} · {e.venue ?? "venue TBD"}
        </div>
        <div className="row" style={{ gap: 9, fontSize: 11.5, color: "var(--ink-mute)" }}>
          <span>
            Lead <b style={{ color: "var(--ink)" }}>{e.lead_id ? nameOf.get(e.lead_id) : "unassigned"}</b>
          </span>
          <span style={{ color: "#c2cdd5" }}>·</span>
          <span>
            {hs.filter((h) => h.confirmed_by_lead).length} confirmed / {hs.length} helpers
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHead
        title="Annual Events"
        sub="Helpers self-add; the lead confirms — only confirmed assists count for compliance."
        actions={
          <Link href="/events/new" className="btn">
            + New event
          </Link>
        }
      />

      <SectionLabel>Upcoming &amp; planning · helpers feed obligations</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {upcoming.map((e) => (
          <Card key={e.id} e={e} />
        ))}
        {upcoming.length === 0 && <div className="card muted">Nothing planned.</div>}
      </div>

      {past.length > 0 && (
        <>
          <SectionLabel>Past</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.map((e) => (
              <Card key={e.id} e={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
