"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { notifyMember } from "@/lib/mailer";
import type { ExpenseClaimRow, PositionName, MemberRow } from "@/lib/database.types";

const TREASURER: PositionName[] = ["Treasurer"];

export interface Result {
  error?: string;
  ok?: boolean;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function submitClaim(_p: Result, fd: FormData): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const amount = Number(s(fd, "amount"));
  if (!amount || amount <= 0) return { error: "Enter a valid amount." };
  const { error } = await db.from("expense_claims").insert({
    member_id: member.id,
    amount,
    description: s(fd, "description") || null,
    receipt_url: s(fd, "receipt_url") || null,
  });
  if (error) return { error: error.message };

  // notify the Treasurer
  const { data: treas } = await db
    .from("member_positions")
    .select("members!inner(*)")
    .eq("position", "Treasurer")
    .is("end_date", null)
    .maybeSingle();
  const treasurer = (treas as unknown as { members: MemberRow } | null)?.members;
  if (treasurer) {
    await notifyMember(db, treasurer, {
      type: "claim_submitted",
      title: `Expense claim from ${member.name}`,
      lines: [`₹${amount} — ${s(fd, "description") || "no description"}.`],
      link: "/finances",
    });
  }
  revalidatePath("/finances");
  return { ok: true };
}

export async function setClaimStatus(
  id: string,
  status: ExpenseClaimRow["status"],
): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, TREASURER))
    return { error: "Only the Treasurer can action claims." };
  const db = createClient();
  const patch: Partial<ExpenseClaimRow> = { status };
  if (status === "Settled") patch.settled_at = new Date().toISOString();
  const { error } = await db.from("expense_claims").update(patch).eq("id", id);
  if (error) return { error: error.message };

  const { data: claim } = await db
    .from("expense_claims")
    .select("member_id, amount")
    .eq("id", id)
    .single();
  if (claim) {
    const { data: m } = await db
      .from("members")
      .select("*")
      .eq("id", claim.member_id)
      .single();
    if (m) {
      await notifyMember(db, m as MemberRow, {
        type: "claim_update",
        title: `Your expense claim is now ${status}`,
        lines: [`₹${claim.amount} claim.`],
        link: "/finances",
      });
    }
  }
  revalidatePath("/finances");
  return { ok: true };
}
