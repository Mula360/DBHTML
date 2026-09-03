import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { istParts } from "@/lib/dates";
import { runActionItemReminders } from "./tasks/actionItems";
import { runWalkReminders } from "./tasks/walks";
import { runSocietyMemberStatusRecompute } from "./tasks/societyMembers";
import { runStatutoryReminders } from "./tasks/statutory";
import { runWeeklyDigest, runMonthlyDigest } from "./tasks/digests";

type DB = SupabaseClient<Database>;
type IstParts = ReturnType<typeof istParts>;

export interface DispatcherSummary {
  ran: string[];
  counts: Record<string, number>;
  errors: Record<string, string>;
}

/**
 * Branches on the IST date and runs the applicable scheduled tasks. Each task
 * is isolated: a failure is recorded and the rest still run. All thresholds
 * come from `compliance_config` — nothing is hardcoded here.
 */
export async function runDailyDispatcher(
  db: DB,
  parts: IstParts,
): Promise<DispatcherSummary> {
  const ran: string[] = [];
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const today = parts.iso;

  const step = async (
    name: string,
    fn: () => Promise<Record<string, number>>,
  ) => {
    try {
      Object.assign(counts, await fn());
      ran.push(name);
    } catch (err) {
      errors[name] = (err as Error).message;
      console.error(`[cron] ${name} failed:`, err);
    }
  };

  const { data: config } = await db
    .from("compliance_config")
    .select("*, terms!inner(is_current)")
    .eq("terms.is_current", true)
    .maybeSingle();

  // ---- EVERY DAY ----------------------------------------------------------
  await step("action_item_reminders", () => runActionItemReminders(db, today));
  await step("walk_reminders", () => runWalkReminders(db, today));
  await step("society_member_status", () =>
    runSocietyMemberStatusRecompute(db, today),
  );
  await step("statutory_reminders", () => runStatutoryReminders(db, today));

  // ---- MONDAY -----------------------------------------------------------
  if (parts.weekday === 1) {
    await step("weekly_digest", () => runWeeklyDigest(db, today));
  }

  // ---- 1st OF MONTH ---------------------------------------------------
  if (parts.day === 1) {
    await step("monthly_digest", () => runMonthlyDigest(db, today));
  }

  // ---- MID-YEAR PACE ALERT (Phase 4) -------------------------------
  if (config && parts.day === 1 && parts.month === config.midyear_alert_month) {
    ran.push("midyear_alert:pending-P4");
  }

  // ---- YEAR-END COMPLIANCE REPORT (Phase 4) ----------------------
  if (
    config &&
    parts.month === config.yearend_report_month &&
    parts.day === config.yearend_report_day
  ) {
    ran.push("yearend_report:pending-P4");
  }

  return { ran, counts, errors };
}
