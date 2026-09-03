import type { DB } from "./shared";
import type { MemberRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";

/** Remind members who RSVP'd 'attending' about a walk happening tomorrow. */
export async function runWalkReminders(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const tomorrow = addDays(today, 1);
  const { data: walks } = await db
    .from("walks")
    .select("id, title, location, date, meet_time, meet_point")
    .eq("date", tomorrow);

  let notified = 0;
  for (const w of walks ?? []) {
    const { data: rsvps } = await db
      .from("walk_attendance")
      .select("members!inner(*)")
      .eq("walk_id", w.id)
      .eq("rsvp_status", "attending");
    const members = ((rsvps ?? []) as unknown as { members: MemberRow }[]).map(
      (r) => r.members,
    );
    for (const m of members) {
      await notifyMember(db, m, {
        type: "walk_tomorrow",
        title: `Walk tomorrow: ${w.title}`,
        lines: [
          `${w.title} at ${w.location} is tomorrow (${w.date}).`,
          w.meet_point || w.meet_time
            ? `Meet ${w.meet_time ?? ""} ${w.meet_point ? `at ${w.meet_point}` : ""}.`.trim()
            : "Details on the walk page.",
        ],
        link: `/walks/${w.id}`,
      });
      notified++;
    }
  }
  return { walks_tomorrow: (walks ?? []).length, members_notified: notified };
}
