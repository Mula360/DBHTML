import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendMail, basicHtml } from "@/lib/resend";
import { createNotification } from "@/lib/notifications";
import { env } from "@/lib/env";

type DB = SupabaseClient<Database>;

export interface Notice {
  type: string;
  title: string;
  /** Plain sentences; each becomes a paragraph in the email. */
  lines: string[];
  /** App-relative path, e.g. "/action-items/abc". */
  link: string;
}

/**
 * The one way the app tells a member something: an in-app notification row
 * plus an email. Safe to call from the cron dispatcher (pass the admin client).
 * Never throws — a mail failure is logged, the notification still lands.
 */
export async function notifyMember(
  db: DB,
  member: { id: string; email: string; name?: string },
  notice: Notice,
): Promise<void> {
  await createNotification(
    db,
    member.id,
    notice.type,
    notice.title,
    notice.lines.join(" "),
    notice.link,
  );
  try {
    const url = `${env.appUrl()}${notice.link}`;
    await sendMail({
      to: member.email,
      subject: notice.title,
      html: basicHtml(notice.title, [
        ...notice.lines,
        `<a href="${url}">Open in the portal</a>`,
      ]),
    });
  } catch (err) {
    console.error(`notifyMember email failed for ${member.email}:`, err);
  }
}
