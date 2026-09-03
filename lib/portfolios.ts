import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MemberRow, PositionName } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export interface CurrentTerm {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

export async function getCurrentTerm(db: DB): Promise<CurrentTerm | null> {
  const { data } = await db
    .from("terms")
    .select("id, label, start_date, end_date")
    .eq("is_current", true)
    .maybeSingle();
  return data ?? null;
}

/**
 * Lead + support members for a portfolio in the current term. Returns [] for
 * the synthetic "General" tag or an unknown portfolio.
 */
export async function getPortfolioMembers(
  db: DB,
  portfolioTag: string,
): Promise<{ lead: MemberRow | null; support: MemberRow[] }> {
  if (!portfolioTag || portfolioTag === "General") {
    return { lead: null, support: [] };
  }
  const term = await getCurrentTerm(db);
  if (!term) return { lead: null, support: [] };

  const { data: pa } = await db
    .from("portfolio_assignments")
    .select("lead_member_id, support_member_ids")
    .eq("term_id", term.id)
    .eq("portfolio_name", portfolioTag)
    .maybeSingle();
  if (!pa) return { lead: null, support: [] };

  const ids = [
    ...(pa.lead_member_id ? [pa.lead_member_id] : []),
    ...(pa.support_member_ids ?? []),
  ];
  if (ids.length === 0) return { lead: null, support: [] };

  const { data: members } = await db
    .from("members")
    .select("*")
    .in("id", ids);

  const byId = new Map((members ?? []).map((m) => [m.id, m as MemberRow]));
  return {
    lead: pa.lead_member_id ? (byId.get(pa.lead_member_id) ?? null) : null,
    support: (pa.support_member_ids ?? [])
      .map((id) => byId.get(id))
      .filter((m): m is MemberRow => Boolean(m)),
  };
}

/** Members holding any of the given current-term positions. */
export async function getMembersByPosition(
  db: DB,
  positions: PositionName[],
): Promise<MemberRow[]> {
  const term = await getCurrentTerm(db);
  if (!term) return [];
  const { data } = await db
    .from("member_positions")
    .select("members!inner(*)")
    .eq("term_id", term.id)
    .is("end_date", null)
    .in("position", positions);
  return ((data ?? []) as unknown as { members: MemberRow }[]).map(
    (r) => r.members,
  );
}
