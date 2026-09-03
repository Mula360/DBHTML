import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { istParts } from "@/lib/dates";

type DB = SupabaseClient<Database>;
type IstParts = ReturnType<typeof istParts>;

export interface DispatcherSummary {
  ran: string[];
  counts: Record<string, number>;
}

/**
 * Branches on the IST date and runs the applicable scheduled tasks.
 * Task bodies are filled in as their modules ship (Phase 2+). Each task is
 * defensive: it must not throw if its module's data does not exist yet.
 */
export async function runDailyDispatcher(
  db: DB,
  parts: IstParts,
): Promise<DispatcherSummary> {
  const ran: string[] = [];
  const counts: Record<string, number> = {};

  // Load the current term's compliance config once; every threshold is read
  // from here, never hardcoded.
  const { data: config } = await db
    .from("compliance_config")
    .select("*, terms!inner(is_current)")
    .eq("terms.is_current", true)
    .maybeSingle();

  // ---- EVERY DAY ----------------------------------------------------------
  // TODO(P2): due-in-3-days reminders, newly-overdue flags + emails,
  //           7+ days overdue escalation list, walk-tomorrow reminders,
  //           society_members status recompute, statutory 14-day reminders.
  ran.push("daily");

  // ---- MONDAY -----------------------------------------------------------
  if (parts.weekday === 1) {
    // TODO(P2): per-member weekly digest.
    ran.push("weekly-digest");
  }

  // ---- 1st OF MONTH ---------------------------------------------------
  if (parts.day === 1) {
    // TODO(P2): EC-wide monthly digest + renewals-due list.
    ran.push("monthly-digest");
  }

  // ---- MID-YEAR PACE ALERT -------------------------------------------
  if (config && parts.day === 1 && parts.month === config.midyear_alert_month) {
    // TODO(P4): pace alerts for members behind on obligations.
    ran.push("midyear-alert");
  }

  // ---- YEAR-END COMPLIANCE REPORT ----------------------------------
  if (
    config &&
    parts.month === config.yearend_report_month &&
    parts.day === config.yearend_report_day
  ) {
    // TODO(P4): generate year-end compliance report + email officers.
    ran.push("yearend-report");
  }

  return { ran, counts };
}
