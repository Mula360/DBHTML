import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { istParts } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyDispatcher } from "@/lib/cron/dispatcher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Single daily entry point. Schedule any external cron to hit this at
 * 02:30 UTC (08:00 IST) with `Authorization: Bearer <CRON_SECRET>`.
 * The dispatcher decides which tasks apply to today's IST date.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const fromVercelCron = request.headers.get("x-vercel-cron") !== null;
  // Vercel Cron sends the header AND (when configured) the Bearer secret. An
  // external scheduler must present the Bearer secret. A caller with neither
  // is rejected.
  const bearerOk = auth === `Bearer ${env.cronSecret()}`;
  if (!bearerOk && !fromVercelCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parts = istParts();
  const db = createAdminClient();

  try {
    const summary = await runDailyDispatcher(db, parts);
    return NextResponse.json({ ok: true, date: parts.iso, ...summary });
  } catch (err) {
    console.error("[cron/daily] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
