import type { MemberRow } from "@/lib/database.types";

export type MatchableMember = Pick<
  MemberRow,
  "id" | "name" | "google_email" | "email"
>;

/**
 * Resolve a Google Meet participant identity (an email or a display name) to an
 * EC member id. Order: exact google_email → exact primary email → exact
 * lowercase name → first-name match. Returns null when nothing is confident.
 */
export function matchMember(
  nameOrEmail: string | null | undefined,
  members: MatchableMember[],
): string | null {
  if (!nameOrEmail) return null;
  const needle = nameOrEmail.trim().toLowerCase();
  if (!needle) return null;

  if (needle.includes("@")) {
    const byGoogle = members.find(
      (m) => (m.google_email ?? "").toLowerCase() === needle,
    );
    if (byGoogle) return byGoogle.id;
    const byEmail = members.find((m) => m.email.toLowerCase() === needle);
    if (byEmail) return byEmail.id;
    return null;
  }

  const exact = members.find((m) => m.name.toLowerCase() === needle);
  if (exact) return exact.id;

  const first = needle.split(/\s+/)[0];
  const byFirst = members.filter(
    (m) => m.name.toLowerCase().split(/\s+/)[0] === first,
  );
  return byFirst.length === 1 ? byFirst[0].id : null;
}
