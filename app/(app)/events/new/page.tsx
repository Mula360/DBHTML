import { createClient } from "@/lib/supabase/server";
import { PORTFOLIO_TAGS, prettyPortfolio } from "@/lib/constants";
import type { MemberRow } from "@/lib/database.types";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const db = createClient();
  const { data: members } = await db
    .from("members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <h1>New event</h1>
      <NewEventForm
        members={(members ?? []) as Pick<MemberRow, "id" | "name">[]}
        portfolios={PORTFOLIO_TAGS.map((p) => ({ value: p, label: prettyPortfolio(p) }))}
      />
    </div>
  );
}
