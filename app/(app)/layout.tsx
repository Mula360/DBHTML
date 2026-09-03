import { getSessionMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import { Shell } from "./Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, position } = await getSessionMember();
  const db = createClient();
  const today = istToday();

  const [unread, myOpen, upcomingMeetings, upcomingWalks, pittaPlanning, pendingClaims] =
    await Promise.all([
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .then((r) => r.count ?? 0),
      db
        .from("action_items")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", member.id)
        .in("status", ["Open", "InProgress"])
        .then((r) => r.count ?? 0),
      db
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .gte("date", today)
        .then((r) => r.count ?? 0),
      db
        .from("walks")
        .select("id", { count: "exact", head: true })
        .gte("date", today)
        .then((r) => r.count ?? 0),
      db
        .from("pitta_issues")
        .select("id", { count: "exact", head: true })
        .neq("status", "Published")
        .then((r) => r.count ?? 0),
      db
        .from("expense_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending")
        .then((r) => r.count ?? 0),
    ]);

  return (
    <Shell
      position={position}
      name={member.name}
      role={position ?? "EC member"}
      unread={unread}
      counts={{
        actions: myOpen,
        meetings: upcomingMeetings,
        walks: upcomingWalks,
        pitta: pittaPlanning,
        claims: pendingClaims,
      }}
    >
      {children}
    </Shell>
  );
}
