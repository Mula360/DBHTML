"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";

export async function markAllRead(): Promise<void> {
  const { member } = await getSessionMember();
  const db = createClient();
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("member_id", member.id)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
