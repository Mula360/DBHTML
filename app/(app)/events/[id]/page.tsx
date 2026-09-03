import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { addDays, istToday, daysBetween } from "@/lib/dates";
import { prettyPortfolio } from "@/lib/constants";
import type {
  EventRow,
  EventHelperRow,
  AgmChecklistRow,
  MemberRow,
} from "@/lib/database.types";
import { HelperControls } from "./HelperControls";
import { EventStatusControl } from "./EventStatusControl";
import { AgmChecklistPanel } from "./AgmChecklistPanel";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();
  const { member } = await getSessionMember();

  const { data: event } = await db
    .from("events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!event) notFound();
  const e = event as EventRow;

  const [{ data: helpers }, { data: members }, { data: pos }, { data: agm }] =
    await Promise.all([
      db.from("event_helpers").select("*").eq("event_id", params.id),
      db.from("members").select("id, name").order("name"),
      db.rpc("get_my_position"),
      e.type === "AGM"
        ? db.from("agm_checklists").select("*").eq("event_id", params.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const helperRows = (helpers ?? []) as EventHelperRow[];
  const nameOf = new Map(
    ((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => [m.id, m.name]),
  );
  const myHelper = helperRows.find((h) => h.member_id === member.id);
  const canManage =
    e.lead_id === member.id || pos === "Secretary" || pos === "President";
  const agmRow = (agm ?? null) as AgmChecklistRow | null;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 780 }}>
      <Link href="/events" style={{ fontSize: 13 }}>
        ← All events
      </Link>

      <div className="card" style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: 22 }}>{e.title}</h1>
        <p style={{ color: "#667" }}>
          <span className="badge">{e.type}</span> · {e.date ?? "no date"} ·{" "}
          {e.venue ?? "venue TBD"}
          {e.portfolio_tag ? ` · ${prettyPortfolio(e.portfolio_tag)}` : ""} · lead:{" "}
          {e.lead_id ? nameOf.get(e.lead_id) : "unassigned"}
        </p>
        {canManage ? (
          <EventStatusControl eventId={e.id} status={e.status} />
        ) : (
          <span className="badge">{e.status}</span>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>
          Helpers ({helperRows.filter((h) => h.confirmed_by_lead).length} confirmed)
        </h3>
        <HelperControls
          eventId={e.id}
          amHelper={Boolean(myHelper)}
          canConfirm={canManage}
          helpers={helperRows.map((h) => ({
            id: h.id,
            name: nameOf.get(h.member_id) ?? "—",
            confirmed: h.confirmed_by_lead,
          }))}
        />
        <p style={{ fontSize: 12, color: "#889", marginTop: 8 }}>
          Only lead-confirmed assists count toward the events compliance
          obligation.
        </p>
      </div>

      {e.type === "AGM" && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>AGM statutory checklist</h3>
          {!agmRow && !e.date && (
            <p style={{ color: "#889", fontSize: 14 }}>
              Set an event date to generate the notice deadline and nomination
              window.
            </p>
          )}
          {agmRow && (
            <>
              {!agmRow.venue_named_in_notice && (
                <p className="card rag-amber" style={{ fontSize: 13, marginBottom: 10 }}>
                  A notice without a named venue may not start the 15-day clock.
                </p>
              )}
              {e.date && agmRow.notice_deadline && !agmRow.notice_sent_date && (
                <p style={{ fontSize: 13, marginBottom: 10 }}>
                  Notice due by <b>{agmRow.notice_deadline}</b> (send 2 days
                  earlier as a buffer). {daysBetween(istToday(), agmRow.notice_deadline)}{" "}
                  days left. Notice period ends {addDays(e.date, -15)}.
                </p>
              )}
              <AgmChecklistPanel
                eventId={e.id}
                initial={agmRow}
                readOnly={!canManage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
