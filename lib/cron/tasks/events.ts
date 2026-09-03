import type { DB } from "./shared";
import type { EventRow, MemberRow, AgmChecklistRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";
import { getMembersByPosition } from "@/lib/portfolios";

async function activeMembers(db: DB): Promise<MemberRow[]> {
  const { data } = await db.from("members").select("*").eq("is_active", true);
  return (data ?? []) as MemberRow[];
}

/** Event reminders at T-30 / T-7 / T-1, plus AGM notice-deadline alerts. */
export async function runEventReminders(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const targets = [30, 7, 1].map((d) => addDays(today, d));
  const { data: events } = await db
    .from("events")
    .select("*")
    .in("date", targets)
    .neq("status", "Done");
  const evs = (events ?? []) as EventRow[];

  const members = await activeMembers(db);
  for (const e of evs) {
    const days = Math.round(
      (new Date(`${e.date}T00:00:00Z`).getTime() -
        new Date(`${today}T00:00:00Z`).getTime()) /
        86_400_000,
    );
    for (const m of members) {
      await notifyMember(db, m, {
        type: "event_reminder",
        title: `${e.title} in ${days} day${days === 1 ? "" : "s"}`,
        lines: [
          `${e.title} (${e.type}) — ${e.date}${e.venue ? ` at ${e.venue}` : ""}.`,
        ],
        link: `/events/${e.id}`,
      });
    }
  }

  // ---- AGM notice-deadline alerts to the Secretary ----
  const { data: agmRows } = await db
    .from("agm_checklists")
    .select("*")
    .is("notice_sent_date", null);
  const agmList = (agmRows ?? []) as AgmChecklistRow[];
  const { data: agmEvents } = agmList.length
    ? await db
        .from("events")
        .select("id, title, date, status")
        .in("id", agmList.map((r) => r.event_id))
    : { data: [] };
  const eventById = new Map(
    (agmEvents ?? []).map((e) => [e.id, e as EventRow]),
  );
  const secretaries = await getMembersByPosition(db, ["Secretary", "President"]);

  let agmAlerts = 0;
  for (const row of agmList) {
    const ev = eventById.get(row.event_id);
    if (!ev || !ev.date || ev.status === "Done") continue;
    const alertDays = [30, 20, 17].map((d) => addDays(today, d));
    if (row.notice_deadline && alertDays.includes(row.notice_deadline)) {
      for (const s of secretaries) {
        await notifyMember(db, s, {
          type: "agm_notice_alert",
          title: `AGM notice for "${ev.title}" not yet sent`,
          lines: [
            `The 15-day notice for the AGM on ${ev.date} is due by ${row.notice_deadline}.`,
            row.venue_named_in_notice
              ? ""
              : "The notice must name the venue to start the 15-day clock.",
          ].filter(Boolean),
          link: `/events/${ev.id}`,
        });
        agmAlerts++;
      }
    }
  }

  return { events_reminded: evs.length, agm_notice_alerts: agmAlerts };
}

/** Clone recurring statutory items whose due date has passed into next year. */
export async function runRecurringStatutory(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const { data: items } = await db
    .from("statutory_items")
    .select("*")
    .eq("recurring_yearly", true)
    .eq("status", "Done")
    .not("due_date", "is", null)
    .lt("due_date", today);

  let cloned = 0;
  for (const it of items ?? []) {
    const nextDue = bumpYear(it.due_date as string);
    const { data: exists } = await db
      .from("statutory_items")
      .select("id")
      .eq("title", it.title)
      .eq("due_date", nextDue)
      .maybeSingle();
    if (exists) continue;
    await db.from("statutory_items").insert({
      title: it.title,
      authority: it.authority,
      due_date: nextDue,
      document_url: null,
      recurring_yearly: true,
      term_id: it.term_id,
      status: "Pending",
    });
    cloned++;
  }
  return { recurring_statutory_cloned: cloned };
}

function bumpYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
