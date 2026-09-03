"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import type { EventRow } from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const EVENT_TYPES: EventRow["type"][] = [
  "AGM",
  "AnnualDinner",
  "BirdRace",
  "AWC",
  "HBASeason",
  "Outreach",
  "Other",
];

export async function createEvent(_p: Result, fd: FormData): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const title = s(fd, "title");
  const type = s(fd, "type") as EventRow["type"];
  if (!title || !EVENT_TYPES.includes(type))
    return { error: "Title and a valid type are required." };

  const date = s(fd, "date") || null;
  const { data: event, error } = await db
    .from("events")
    .insert({
      title,
      type,
      date,
      venue: s(fd, "venue") || null,
      portfolio_tag: s(fd, "portfolio_tag") || null,
      lead_id: s(fd, "lead_id") || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // AGM → auto-create the statutory checklist with computed deadlines.
  if (type === "AGM" && date) {
    await db.from("agm_checklists").insert({
      event_id: event.id,
      notice_deadline: addDays(date, -15),
      nominations_open: addDays(date, -21),
      nominations_close: addDays(date, -7),
    });
  }
  redirect(`/events/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  patch: Partial<
    Pick<EventRow, "status" | "venue" | "date" | "portfolio_tag" | "lead_id" | "outcome_notes">
  >,
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const { error } = await db.from("events").update(patch).eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function toggleSelfHelper(eventId: string): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const { data: existing } = await db
    .from("event_helpers")
    .select("id")
    .eq("event_id", eventId)
    .eq("member_id", member.id)
    .maybeSingle();
  if (existing) {
    await db.from("event_helpers").delete().eq("id", existing.id);
  } else {
    await db
      .from("event_helpers")
      .insert({ event_id: eventId, member_id: member.id });
  }
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function confirmHelper(
  eventId: string,
  helperId: string,
  confirmed: boolean,
): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const { data: event } = await db
    .from("events")
    .select("lead_id")
    .eq("id", eventId)
    .maybeSingle();
  const { data: pos } = await db.rpc("get_my_position");
  if (event?.lead_id !== member.id && pos !== "Secretary" && pos !== "President") {
    return { error: "Only the event lead or Secretary can confirm assists." };
  }
  const { error } = await db
    .from("event_helpers")
    .update({ confirmed_by_lead: confirmed })
    .eq("id", helperId);
  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function updateAgmChecklist(
  eventId: string,
  patch: Partial<
    Pick<
      import("@/lib/database.types").AgmChecklistRow,
      | "venue_named_in_notice"
      | "post_agm_filings_done"
      | "notice_sent_date"
      | "nominations_open"
      | "nominations_close"
      | "quorum_required"
    >
  >,
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const { error } = await db
    .from("agm_checklists")
    .update(patch)
    .eq("event_id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}
