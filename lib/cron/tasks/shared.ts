import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { addDays, istToday } from "@/lib/dates";

export type DB = SupabaseClient<Database>;

export interface UpcomingWalk {
  id: string;
  title: string;
  location: string;
  date: string;
}

/** Walks in the next `days` days (inclusive of today). Returns [] on any error. */
export async function getUpcomingWalks(
  db: DB,
  days = 7,
  today = istToday(),
): Promise<UpcomingWalk[]> {
  try {
    const { data } = await db
      .from("walks")
      .select("id, title, location, date")
      .gte("date", today)
      .lte("date", addDays(today, days))
      .order("date");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUpcomingMeetings(db: DB, days = 7, today = istToday()) {
  try {
    const { data } = await db
      .from("meetings")
      .select("id, title, date, time")
      .gte("date", today)
      .lte("date", addDays(today, days))
      .order("date");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUpcomingEvents(db: DB, days = 30, today = istToday()) {
  try {
    const { data } = await db
      .from("events")
      .select("id, title, type, date")
      .not("date", "is", null)
      .gte("date", today)
      .lte("date", addDays(today, days))
      .order("date");
    return (data ?? []) as { id: string; title: string; type: string; date: string }[];
  } catch {
    return [];
  }
}
