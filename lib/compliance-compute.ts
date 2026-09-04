import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ComplianceConfigRow,
  MemberRow,
} from "@/lib/database.types";
import { getComplianceYear, paceRag, pittaWindowStart, type Rag } from "@/lib/compliance";
import { istToday } from "@/lib/dates";

type DB = SupabaseClient<Database>;

export interface Obligation {
  key: "trips" | "meetings" | "events" | "pitta";
  label: string;
  achieved: number;
  minimum: number;
  rag: Rag;
  note: string;
}

export interface MemberObligations {
  member: Pick<MemberRow, "id" | "name">;
  position: string | null;
  obligations: Obligation[];
  overall: Rag;
}

const worst = (rs: Rag[]): Rag =>
  rs.includes("red") ? "red" : rs.includes("amber") ? "amber" : "green";

/**
 * Computes the four baseline obligations for every active member, entirely
 * from compliance_config (no hardcoded thresholds). Field trips / meetings /
 * events use the compliance year; Pitta uses a rolling window.
 */
export async function computeAllObligations(
  db: DB,
  config: ComplianceConfigRow,
  today = istToday(),
): Promise<MemberObligations[]> {
  const year = getComplianceYear(today, config);
  const pittaStart = pittaWindowStart(config, today);

  const [{ data: members }, { data: positions }] = await Promise.all([
    db.from("members").select("id, name").eq("is_active", true).order("name"),
    db
      .from("member_positions")
      .select("member_id, position, term_id, end_date, terms!inner(is_current)")
      .is("end_date", null)
      .eq("terms.is_current", true),
  ]);
  const posByMember = new Map(
    (positions ?? []).map((p) => [p.member_id, p.position]),
  );

  const attStatuses: ("present" | "apology")[] = config.apology_counts_as_attended
    ? ["present", "apology"]
    : ["present"];

  // All five tally sources run in parallel — one round-trip's worth of latency
  // instead of five sequential ones.
  const [
    { data: coords },
    { data: att },
    { data: helpers },
    { data: leads },
    { data: pitta },
  ] = await Promise.all([
    db
      .from("walk_coordinators")
      .select("member_id, walks!inner(date)")
      .gte("walks.date", year.start)
      .lte("walks.date", year.end),
    db
      .from("meeting_attendance")
      .select("member_id, status, meetings!inner(date)")
      .in("status", attStatuses)
      .gte("meetings.date", year.start)
      .lte("meetings.date", year.end),
    db
      .from("event_helpers")
      .select("member_id, confirmed_by_lead, events!inner(date, type)")
      .eq("confirmed_by_lead", true)
      .not("events.date", "is", null)
      .gte("events.date", year.start)
      .lte("events.date", year.end),
    db
      .from("events")
      .select("lead_id, date")
      .not("lead_id", "is", null)
      .not("date", "is", null)
      .gte("date", year.start)
      .lte("date", year.end),
    db
      .from("pitta_contributions")
      .select("member_id, submitted_at")
      .gte("submitted_at", pittaStart),
  ]);

  const trips = tally((coords ?? []).map((c) => c.member_id));
  const meetings = tally((att ?? []).map((a) => a.member_id));
  const events = tally([
    ...(helpers ?? []).map((h) => h.member_id),
    ...(leads ?? []).map((l) => l.lead_id as string),
  ]);
  const pittaCounts = tally((pitta ?? []).map((p) => p.member_id));
  const lastPitta = new Map<string, string>();
  for (const p of pitta ?? []) {
    const cur = lastPitta.get(p.member_id);
    if (!cur || p.submitted_at > cur) lastPitta.set(p.member_id, p.submitted_at);
  }

  return (members ?? []).map((m) => {
    const rag = (a: number, min: number) =>
      paceRag(a, min, year.start, year.end, today);
    const obligations: Obligation[] = [
      {
        key: "trips",
        label: "Field trips coordinated",
        achieved: trips.get(m.id) ?? 0,
        minimum: config.min_field_trips,
        rag: rag(trips.get(m.id) ?? 0, config.min_field_trips),
        note: `Minimum ${config.min_field_trips} per compliance year.`,
      },
      {
        key: "meetings",
        label: "Meetings attended",
        achieved: meetings.get(m.id) ?? 0,
        minimum: config.min_meetings,
        rag: rag(meetings.get(m.id) ?? 0, config.min_meetings),
        note: config.apology_counts_as_attended
          ? "Present or apology counts."
          : "Present counts.",
      },
      {
        key: "events",
        label: "Annual events assisted",
        achieved: events.get(m.id) ?? 0,
        minimum: config.min_events,
        rag: rag(events.get(m.id) ?? 0, config.min_events),
        note: "Lead-confirmed assists and event leads.",
      },
      {
        key: "pitta",
        label: "Pitta contributions",
        achieved: pittaCounts.get(m.id) ?? 0,
        minimum: config.pitta_min_contributions,
        rag:
          (pittaCounts.get(m.id) ?? 0) >= config.pitta_min_contributions
            ? "green"
            : lastPitta.get(m.id)
              ? "amber"
              : "red",
        note: lastPitta.get(m.id)
          ? `Last contribution ${lastPitta.get(m.id)} (rolling ${config.pitta_window_days} days).`
          : `None in the last ${config.pitta_window_days} days.`,
      },
    ];
    return {
      member: m,
      position: posByMember.get(m.id) ?? null,
      obligations,
      overall: worst(obligations.map((o) => o.rag)),
    };
  });
}

function tally(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) if (id) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

export async function getCurrentConfig(db: DB): Promise<ComplianceConfigRow | null> {
  const { data } = await db
    .from("compliance_config")
    .select("*, terms!inner(is_current)")
    .eq("terms.is_current", true)
    .maybeSingle();
  if (!data) return null;
  const config = { ...(data as ComplianceConfigRow & { terms?: unknown }) };
  delete config.terms;
  return config as ComplianceConfigRow;
}
