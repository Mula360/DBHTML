import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { istParts } from "@/lib/dates";
import { runActionItemReminders } from "./tasks/actionItems";
import { runWalkReminders } from "./tasks/walks";
import { runSocietyMemberStatusRecompute } from "./tasks/societyMembers";
import { runStatutoryReminders } from "./tasks/statutory";
import { runWeeklyDigest, runMonthlyDigest } from "./tasks/digests";
import {
  runMidyearPaceAlert,
  runPittaNudge,
  runYearendReport,
} from "./tasks/compliance";
import { runEventReminders, runRecurringStatutory } from "./tasks/events";
import { runGoogleMeetIngest } from "./tasks/googleMeet";
import type { ComplianceConfigRow } from "@/lib/database.types";

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
  const startedAt = Date.now();
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

  const { data: configRaw } = await db
    .from("compliance_config")
    .select("*, terms!inner(is_current)")
    .eq("terms.is_current", true)
    .maybeSingle();
  let config: ComplianceConfigRow | null = null;
  if (configRaw) {
    const rest = { ...(configRaw as ComplianceConfigRow & { terms?: unknown }) };
    delete rest.terms;
    config = rest as ComplianceConfigRow;
  }

  // ---- EVERY DAY ----------------------------------------------------------
  await step("action_item_reminders", () => runActionItemReminders(db, today));
  await step("walk_reminders", () => runWalkReminders(db, today));
  await step("society_member_status", () =>
    runSocietyMemberStatusRecompute(db, today),
  );
  await step("statutory_reminders", () => runStatutoryReminders(db, today));
  await step("event_reminders", () => runEventReminders(db, today));
  await step("recurring_statutory", () => runRecurringStatutory(db, today));
  await step("google_meet_ingest", () => runGoogleMeetIngest(db, today));

  // ---- MONDAY -----------------------------------------------------------
  if (parts.weekday === 1) {
    await step("weekly_digest", () => runWeeklyDigest(db, today));
  }

  // ---- 1st OF MONTH ---------------------------------------------------
  if (parts.day === 1) {
    await step("monthly_digest", () => runMonthlyDigest(db, today));
  }

  // ---- COMPLIANCE: Pitta nudge (daily check; monthly for "never") -----
  if (config) {
    await step("pitta_nudge", () =>
      runPittaNudge(db, config, today, parts.day === 1),
    );
  }

  // ---- MID-YEAR PACE ALERT ------------------------------------------
  if (config && parts.day === 1 && parts.month === config.midyear_alert_month) {
    await step("midyear_pace_alert", () =>
      runMidyearPaceAlert(db, config, today),
    );
  }

  // ---- YEAR-END COMPLIANCE REPORT ----------------------------------
  if (
    config &&
    parts.month === config.yearend_report_month &&
    parts.day === config.yearend_report_day
  ) {
    await step("yearend_report", () => runYearendReport(db, config, today));
  }

  const summary = { ran, counts, errors };
  try {
    await db.from("cron_runs").insert({
      ist_date: today,
      tasks_ran: ran,
      counts,
      errors,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("[cron] failed to persist cron_runs row:", err);
  }
  return summary;
}
