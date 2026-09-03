import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "./Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, position } = await getSessionMember();
  const db = createClient();

  const { data: badgesRaw } = await db.rpc("nav_badges");
  const badges = (badgesRaw ?? {}) as Record<string, number>;

  return (
    <Shell
      position={position}
      name={member.name}
      role={position ?? "EC member"}
      unread={badges.unread ?? 0}
      counts={{
        actions: badges.actions ?? 0,
        meetings: badges.meetings ?? 0,
        walks: badges.walks ?? 0,
        pitta: badges.pitta ?? 0,
        claims: badges.claims ?? 0,
      }}
    >
      {children}
    </Shell>
  );
}
