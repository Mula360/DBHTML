import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, REGISTER_MANAGERS } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import type { SocietyMemberRow } from "@/lib/database.types";

export async function GET() {
  const { position } = await getSessionMember();
  if (!hasPosition(position, REGISTER_MANAGERS)) {
    return new Response("Forbidden", { status: 403 });
  }
  const db = createClient();
  const { data } = await db
    .from("society_members")
    .select("*")
    .eq("is_deleted", false)
    .order("name");
  const rows = (data ?? []) as SocietyMemberRow[];

  const header = [
    "name",
    "email",
    "phone",
    "city",
    "membership_type",
    "membership_number",
    "joined_date",
    "last_renewal_date",
    "renewal_due_date",
    "status",
  ];
  const csv = toCsv([
    header,
    ...rows.map((r) => header.map((h) => (r as Record<string, unknown>)[h] as string)),
  ]);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="deccan-birders-members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
