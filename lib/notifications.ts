import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

/**
 * Every automated email in the app is mirrored to an in-app notification.
 * Pass a service-role client from cron/webhook contexts, or an RLS client
 * when the acting member is allowed to write the target member's row
 * (in practice notifications are created server-side with the admin client).
 */
export async function createNotification(
  db: DB,
  memberId: string,
  type: string,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  const { error } = await db.from("notifications").insert({
    member_id: memberId,
    type,
    title,
    body,
    link,
  });
  if (error) console.error("createNotification failed:", error.message);
}
