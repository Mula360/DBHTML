"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/portfolios";
import type { HbaSeasonRow, AwcSiteRow } from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
}

export async function addPortfolioUpdate(
  portfolio: string,
  text: string,
): Promise<Result> {
  const { member } = await getSessionMember();
  const clean = text.trim();
  if (!clean) return { error: "Empty update." };
  const db = createClient();
  const { error } = await db.from("portfolio_updates").insert({
    portfolio_name: portfolio,
    update_text: clean,
    created_by: member.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/portfolios/${portfolio}`);
  return { ok: true };
}

export async function setPortfolioAssignment(
  portfolio: string,
  leadMemberId: string | null,
  supportMemberIds: string[],
): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "President or Secretary only." };
  const db = createClient();
  const term = await getCurrentTerm(db);
  if (!term) return { error: "No current term." };

  const { data: existing } = await db
    .from("portfolio_assignments")
    .select("id")
    .eq("term_id", term.id)
    .eq("portfolio_name", portfolio)
    .maybeSingle();

  const row = {
    term_id: term.id,
    portfolio_name: portfolio,
    lead_member_id: leadMemberId,
    support_member_ids: supportMemberIds,
  };
  const { error } = existing
    ? await db.from("portfolio_assignments").update(row).eq("id", existing.id)
    : await db.from("portfolio_assignments").insert(row);
  if (error) return { error: error.message };
  revalidatePath(`/portfolios/${portfolio}`);
  return { ok: true };
}

// ---- HBA ----------------------------------------------------------------
export async function upsertHbaSeason(
  row: Partial<HbaSeasonRow> & { id?: string },
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const { error } = row.id
    ? await db.from("hba_seasons").update(row).eq("id", row.id)
    : await db.from("hba_seasons").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/portfolios/HBA");
  return { ok: true };
}

// ---- AWC ----------------------------------------------------------------
export async function upsertAwcSite(
  row: Partial<AwcSiteRow> & { id?: string },
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const { error } = row.id
    ? await db.from("awc_sites").update(row).eq("id", row.id)
    : await db.from("awc_sites").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/portfolios/AWC");
  return { ok: true };
}
