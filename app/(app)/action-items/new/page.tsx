import { createClient } from "@/lib/supabase/server";
import { istToday } from "@/lib/dates";
import type { MemberRow } from "@/lib/database.types";
import { NewItemForm } from "./NewItemForm";

export const dynamic = "force-dynamic";

export default async function NewActionItemPage() {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, date")
    .order("date", { ascending: false })
    .limit(20);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <h1>New action item</h1>
      <NewItemForm
        members={(members ?? []) as Pick<MemberRow, "id" | "name">[]}
        meetings={(meetings ?? []) as { id: string; title: string; date: string }[]}
        today={istToday()}
      />
    </div>
  );
}
