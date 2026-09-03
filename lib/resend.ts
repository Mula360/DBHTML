import { Resend } from "resend";
import { env } from "@/lib/env";

const key = env.resendKey();
const resend = key ? new Resend(key) : null;

export interface Mail {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Sends an email via Resend. If RESEND_API_KEY is unset (local dev / not yet
 * configured) it logs and returns `{ skipped: true }` instead of throwing, so
 * the cron dispatcher and flows keep working.
 */
export async function sendMail(mail: Mail): Promise<{ id?: string; skipped?: boolean }> {
  if (!resend) {
    console.log(`[resend:skipped] to=${mail.to} subject="${mail.subject}"`);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: env.resendFrom(),
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return { id: data?.id };
}

/** Minimal HTML wrapper so plain strings render acceptably. */
export function basicHtml(heading: string, bodyLines: string[]): string {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0D3B5C">${heading}</h2>
    ${bodyLines.map((l) => `<p style="color:#1C1C1C;font-size:15px">${l}</p>`).join("")}
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/>
    <p style="color:#888;font-size:12px">Deccan Birders EC Portal</p>
  </div>`;
}
