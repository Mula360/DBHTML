import type { ComplianceConfigRow } from "@/lib/database.types";
import { addDays, daysBetween, istToday } from "@/lib/dates";

export interface ComplianceYear {
  label: string; // "2026-27"
  start: string; // ISO date
  end: string; // ISO date (exclusive-safe: last day of the window)
}

/**
 * The compliance year containing `date`, defined by config.year_start_month
 * .. year_end_month (inclusive, may wrap across the calendar year).
 */
export function getComplianceYear(
  date: string,
  config: Pick<ComplianceConfigRow, "year_start_month" | "year_end_month">,
): ComplianceYear {
  const [y, m] = date.split("-").map(Number);
  const startMonth = config.year_start_month;
  const wraps = config.year_end_month < startMonth;
  const startYear = m >= startMonth ? y : y - 1;
  const endYear = wraps ? startYear + 1 : startYear;
  const start = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  // last day of year_end_month
  const endMonthFirst = `${endYear}-${String(config.year_end_month).padStart(2, "0")}-01`;
  const end = addDays(nextMonthFirst(endMonthFirst), -1);
  return {
    label:
      startYear === endYear
        ? `${startYear}`
        : `${startYear}-${String(endYear % 100).padStart(2, "0")}`,
    start,
    end,
  };
}

function nextMonthFirst(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export type Rag = "green" | "amber" | "red";

/**
 * Pace-based RAG: green when the minimum is met; otherwise compare the
 * fraction of the minimum achieved against the fraction of the window elapsed.
 */
export function paceRag(
  achieved: number,
  minimum: number,
  windowStart: string,
  windowEnd: string,
  today: string = istToday(),
): Rag {
  if (minimum <= 0 || achieved >= minimum) return "green";
  const total = daysBetween(windowStart, windowEnd) || 1;
  const elapsed = Math.min(Math.max(daysBetween(windowStart, today), 0), total);
  const elapsedFrac = elapsed / total;
  const achievedFrac = achieved / minimum;
  return achievedFrac >= elapsedFrac ? "amber" : "red";
}

/** Pitta uses a rolling window rather than the compliance year. */
export function pittaWindowStart(
  config: Pick<ComplianceConfigRow, "pitta_window_days">,
  today: string = istToday(),
): string {
  return addDays(today, -config.pitta_window_days);
}
