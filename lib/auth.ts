import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRow, PositionName } from "@/lib/database.types";

export interface SessionMember {
  member: MemberRow;
  position: PositionName | null;
}

/**
 * Resolves the logged-in EC member and their current-term position.
 * Redirects to /login if there is no session, or to /login?error=not_member
 * if the authenticated email is not linked to a member row.
 * Cached per request.
 */
export const getSessionMember = cache(async (): Promise<SessionMember> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!member) redirect("/login?error=not_member");

  const { data: position } = await supabase.rpc("get_my_position");

  return {
    member: member as MemberRow,
    position: (position as PositionName | null) ?? null,
  };
});

export const OFFICERS: PositionName[] = ["President", "Secretary"];
export const REGISTER_MANAGERS: PositionName[] = [
  "VP-1",
  "VP-2",
  "EC2",
  "Treasurer",
  "Secretary",
  "President",
];

export function hasPosition(
  pos: PositionName | null,
  allowed: PositionName[],
): boolean {
  return pos !== null && allowed.includes(pos);
}
