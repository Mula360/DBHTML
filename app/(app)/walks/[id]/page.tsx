import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { istToday } from "@/lib/dates";
import type {
  WalkRow,
  WalkAttendanceRow,
  MemberRow,
} from "@/lib/database.types";
import { RsvpButtons } from "./RsvpButtons";
import { AttendanceMarker } from "./AttendanceMarker";

export const dynamic = "force-dynamic";

export default async function WalkDetail({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();
  const { member } = await getSessionMember();

  const { data: walk } = await db
    .from("walks")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!walk) notFound();
  const w = walk as WalkRow;

  const [{ data: coords }, { data: att }, { data: members }, { data: pos }] =
    await Promise.all([
      db.from("walk_coordinators").select("member_id").eq("walk_id", params.id),
      db.from("walk_attendance").select("*").eq("walk_id", params.id),
      db.from("members").select("id, name").eq("is_active", true).order("name"),
      db.rpc("get_my_position"),
    ]);

  const coordIds = new Set((coords ?? []).map((c) => c.member_id));
  const attendance = (att ?? []) as WalkAttendanceRow[];
  const memberList = (members ?? []) as Pick<MemberRow, "id" | "name">[];
  const nameOf = new Map(memberList.map((m) => [m.id, m.name]));
  const myRsvp = attendance.find((a) => a.member_id === member.id)?.rsvp_status;
  const isPast = w.date < istToday();
  const canMark =
    coordIds.has(member.id) || pos === "Secretary" || pos === "President";

  const rsvps = attendance.filter((a) => a.rsvp_status);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <Link href="/walks" style={{ fontSize: 13 }}>
        ← All walks
      </Link>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 22 }}>{w.title}</h1>
        <p style={{ color: "#667" }}>
          {w.location} · {w.date}
          {w.meet_time ? ` · ${w.meet_time}` : ""}
          {w.meet_point ? ` · ${w.meet_point}` : ""} · {w.type}
        </p>
        <p style={{ fontSize: 13 }}>
          Coordinators:{" "}
          {[...coordIds].map((id) => nameOf.get(id)).filter(Boolean).join(", ") ||
            "none set"}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          {w.ebird_list_url && (
            <a className="btn" href={w.ebird_list_url} target="_blank" rel="noreferrer">
              eBird checklist
            </a>
          )}
          {w.photos_drive_url && (
            <a
              className="btn secondary"
              href={w.photos_drive_url}
              target="_blank"
              rel="noreferrer"
            >
              Photos (Drive)
            </a>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Your RSVP</h3>
        <RsvpButtons walkId={w.id} current={myRsvp ?? null} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>
          RSVPs ({rsvps.filter((r) => r.rsvp_status === "attending").length}{" "}
          attending)
        </h3>
        {rsvps.length === 0 && (
          <p style={{ color: "#889", fontSize: 14 }}>No RSVPs yet.</p>
        )}
        {rsvps.map((r) => (
          <div key={r.member_id} style={{ fontSize: 14, padding: "3px 0" }}>
            {nameOf.get(r.member_id) ?? "—"} —{" "}
            {r.rsvp_status === "attending" ? "attending" : "not attending"}
            {r.actually_attended ? " · attended ✓" : ""}
          </div>
        ))}
      </div>

      {isPast && canMark && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Mark who attended</h3>
          <p style={{ fontSize: 12, color: "#889", marginBottom: 8 }}>
            Feeds the field-trip compliance tally for coordinators.
          </p>
          <AttendanceMarker
            walkId={w.id}
            members={memberList}
            attended={attendance
              .filter((a) => a.actually_attended)
              .map((a) => a.member_id)}
          />
        </div>
      )}
    </div>
  );
}
