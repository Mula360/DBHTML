import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function clientIpHash(): string {
  const h = headers();
  const raw =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return "ip:" + createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Throttle auth endpoints. Returns { blocked, retryInMinutes }. Counts prior
 * FAILED attempts in the window for both the email and the caller IP.
 */
export async function checkAuthRate(
  email: string,
  kind: "magic_link" | "password",
): Promise<{ blocked: boolean; retryInMinutes: number }> {
  const db = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const identifiers = [`email:${email.toLowerCase()}`, clientIpHash()];

  const { data } = await db
    .from("auth_attempts")
    .select("identifier, attempted_at, ok")
    .in("identifier", identifiers)
    .gte("attempted_at", since)
    .eq("ok", false);

  const rows = data ?? [];
  for (const id of identifiers) {
    if (rows.filter((r) => r.identifier === id).length >= MAX_FAILURES) {
      void kind;
      return { blocked: true, retryInMinutes: 15 };
    }
  }
  return { blocked: false, retryInMinutes: 0 };
}

/** Record the outcome of an auth attempt (used by the rate limiter). */
export async function recordAuthAttempt(
  email: string,
  kind: "magic_link" | "password",
  ok: boolean,
): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("auth_attempts").insert([
      { identifier: `email:${email.toLowerCase()}`, kind, ok },
      { identifier: clientIpHash(), kind, ok },
    ]);
  } catch (err) {
    console.error("[rate-limit] failed to record attempt:", err);
  }
}
