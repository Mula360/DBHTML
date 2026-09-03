import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import type { MemberRow } from "@/lib/database.types";
import { NewWalkForm } from "./NewWalkForm";

export const dynamic = "force-dynamic";

export default async function NewWalkPage() {
  const db = createClient();
  const { data: members } = await db
    .from("members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <h1>New walk</h1>
      <NewWalkForm
        members={(members ?? []) as Pick<MemberRow, "id" | "name">[]}
        today={istToday()}
      />
    </div>
  );
}
