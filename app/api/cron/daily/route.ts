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
  if (auth !== `Bearer ${env.cronSecret()}`) {
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
