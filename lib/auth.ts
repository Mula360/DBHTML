import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRow, PositionName } from "@/lib/database.types";

export interface SessionMember {
  member: MemberRow;
  position: PositionName | null;
}

/**
 * Resolves the logged-in EC member and their current-term position in a single
 * DB round-trip (app_session RPC). The JWT is verified locally via getClaims()
 * — the middleware already did the authoritative getUser() check on this
 * request, so a second network call to the auth server is avoided.
 * Cached per request.
 */
export const getSessionMember = cache(async (): Promise<SessionMember> => {
  const supabase = createClient();

  let hasSession = false;
  try {
    const { data } = await supabase.auth.getClaims();
    hasSession = Boolean(data?.claims?.sub);
  } catch {
    hasSession = false;
  }
  if (!hasSession) {
    // fall back to the authoritative check before bouncing
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
  }

  const { data: session } = await supabase.rpc("app_session");
  const parsed = (session ?? null) as
    | { member: MemberRow; position: PositionName | null }
    | null;

  if (!parsed?.member) redirect("/login?error=not_member");

  return { member: parsed.member, position: parsed.position ?? null };
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
