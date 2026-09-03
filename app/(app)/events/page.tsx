import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import type { EventRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const db = createClient();
  const today = istToday();
  const { data: rows } = await db
    .from("events")
    .select("*")
    .order("date", { ascending: true, nullsFirst: false });
  const events = (rows ?? []) as EventRow[];
  const upcoming = events.filter((e) => !e.date || e.date >= today);
  const past = events.filter((e) => e.date && e.date < today);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Annual Events</h1>
        <Link className="btn" href="/events/new">
          + New event
        </Link>
      </div>

      <section className="card">
        <h3 style={{ marginBottom: 10 }}>Upcoming &amp; planning</h3>
        {upcoming.length === 0 && <p style={{ color: "#889" }}>Nothing planned.</p>}
        {upcoming.map((e) => (
          <Row key={e.id} e={e} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 10 }}>Past</h3>
          {past.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </section>
      )}
    </div>
  );
}

function Row({ e }: { e: EventRow }) {
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
      <Link href={`/events/${e.id}`}>
        {e.title}{" "}
        <span className="badge" style={{ marginLeft: 4 }}>
          {e.type}
        </span>
      </Link>
      <span style={{ color: "#667" }}>
        {e.date ?? "no date"} · {e.status}
      </span>
    </div>
  );
}
