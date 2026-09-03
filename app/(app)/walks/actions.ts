"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";

export interface Result {
  error?: string;
  ok?: boolean;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createWalk(_p: Result, fd: FormData): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const title = s(fd, "title");
  const location = s(fd, "location");
  const date = s(fd, "date");
  if (!title || !location || !date)
    return { error: "Title, location and date are required." };

  const { data: walk, error } = await db
    .from("walks")
    .insert({
      title,
      location,
      date,
      meet_time: s(fd, "meet_time") || null,
      meet_point: s(fd, "meet_point") || null,
      type: s(fd, "type") === "Outstation" ? "Outstation" : "Local",
      ebird_list_url: s(fd, "ebird_list_url") || null,
      photos_drive_url: s(fd, "photos_drive_url") || null,
      created_by: member.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const coordinators = fd.getAll("coordinators").map(String).filter(Boolean);
  if (coordinators.length > 0) {
    await db.from("walk_coordinators").insert(
      coordinators.map((member_id) => ({ walk_id: walk.id, member_id })),
    );
  }
  redirect(`/walks/${walk.id}`);
}

export async function setCoordinators(
  walkId: string,
  memberIds: string[],
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  await db.from("walk_coordinators").delete().eq("walk_id", walkId);
  if (memberIds.length > 0) {
    const { error } = await db
      .from("walk_coordinators")
      .insert(memberIds.map((member_id) => ({ walk_id: walkId, member_id })));
    if (error) return { error: error.message };
  }
  revalidatePath(`/walks/${walkId}`);
  return { ok: true };
}

export async function rsvp(
  walkId: string,
  status: "attending" | "not_attending",
): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const { error } = await db.from("walk_attendance").upsert(
    { walk_id: walkId, member_id: member.id, rsvp_status: status },
    { onConflict: "walk_id,member_id" },
  );
  if (error) return { error: error.message };
  revalidatePath(`/walks/${walkId}`);
  return { ok: true };
}

/** Coordinator marks who actually turned up (drives compliance obligation 2). */
export async function markAttendance(
  walkId: string,
  entries: { member_id: string; actually_attended: boolean }[],
): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();

  const { data: coords } = await db
    .from("walk_coordinators")
    .select("member_id")
    .eq("walk_id", walkId);
  const isCoord = (coords ?? []).some((c) => c.member_id === member.id);
  const { data: pos } = await db.rpc("get_my_position");
  if (!isCoord && pos !== "Secretary" && pos !== "President") {
    return { error: "Only a walk coordinator or the Secretary can do this." };
  }

  for (const e of entries) {
    await db.from("walk_attendance").upsert(
      {
        walk_id: walkId,
        member_id: e.member_id,
        actually_attended: e.actually_attended,
      },
      { onConflict: "walk_id,member_id" },
    );
  }
  revalidatePath(`/walks/${walkId}`);
  return { ok: true };
}
