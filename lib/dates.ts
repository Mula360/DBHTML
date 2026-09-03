/**
 * All day/due-date comparisons in the app run in Asia/Kolkata.
 * Never compare a `date` column against `new Date()` directly.
 */
export const APP_TZ = "Asia/Kolkata";

/** Today in IST as an ISO date string, e.g. "2026-09-03". */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(now);
}

/** IST calendar parts for date-branching in the cron dispatcher. */
export function istParts(now: Date = new Date()): {
  iso: string;
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  weekday: number; // 0 = Sunday .. 6 = Saturday
} {
  const iso = istToday(now);
  const [year, month, day] = iso.split("-").map(Number);
  // Noon UTC keeps us on the same calendar day regardless of offset.
  const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return { iso, year, month, day, weekday };
}

/** Add days to an ISO date string, returning an ISO date string. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b - a). Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function isPast(iso: string, today: string = istToday()): boolean {
  return iso < today;
}
