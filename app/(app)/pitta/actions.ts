"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { istToday } from "@/lib/dates";
import type { PittaIssueRow, PositionName } from "@/lib/database.types";

const EDITORS: PositionName[] = ["VP-1", "Secretary", "President"];

export interface Result {
  error?: string;
  ok?: boolean;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function guardEditor() {
  const { position } = await getSessionMember();
  if (!hasPosition(position, EDITORS))
    throw new Error("VP-1 (Editor), Secretary or President only.");
}

export async function createIssue(_p: Result, fd: FormData): Promise<Result> {
  try {
    await guardEditor();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const { data, error } = await db
    .from("pitta_issues")
    .insert({
      issue_number: s(fd, "issue_number") || null,
      theme: s(fd, "theme") || null,
      target_publish_date: s(fd, "target_publish_date") || null,
      status: "Planning",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(`/pitta/${data.id}`);
}

export async function setIssueStatus(
  id: string,
  status: PittaIssueRow["status"],
): Promise<Result> {
  try {
    await guardEditor();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const { error } = await db
    .from("pitta_issues")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/pitta/${id}`);
  return { ok: true };
}

export async function upsertContribution(
  issueId: string,
  memberId: string,
  title: string,
): Promise<Result> {
  try {
    await guardEditor();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const clean = title.trim();

  const { data: existing } = await db
    .from("pitta_contributions")
    .select("id")
    .eq("issue_id", issueId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!clean) {
    if (existing) await db.from("pitta_contributions").delete().eq("id", existing.id);
    revalidatePath(`/pitta/${issueId}`);
    return { ok: true };
  }

  const { data: issue } = await db
    .from("pitta_issues")
    .select("target_publish_date, actual_publish_date")
    .eq("id", issueId)
    .single();
  const submitted_at =
    (issue?.actual_publish_date as string) ||
    (issue?.target_publish_date as string) ||
    istToday();

  if (existing) {
    await db
      .from("pitta_contributions")
      .update({ contribution_title: clean })
      .eq("id", existing.id);
  } else {
    await db.from("pitta_contributions").insert({
      issue_id: issueId,
      member_id: memberId,
      contribution_title: clean,
      submitted_at,
    });
  }
  revalidatePath(`/pitta/${issueId}`);
  return { ok: true };
}

/** Publish → set actual date and stamp every contribution's submitted_at to it. */
export async function publishIssue(issueId: string): Promise<Result> {
  try {
    await guardEditor();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const today = istToday();
  const { error } = await db
    .from("pitta_issues")
    .update({ status: "Published", actual_publish_date: today })
    .eq("id", issueId);
  if (error) return { error: error.message };
  await db
    .from("pitta_contributions")
    .update({ submitted_at: today })
    .eq("issue_id", issueId);
  revalidatePath(`/pitta/${issueId}`);
  revalidatePath("/pitta");
  return { ok: true };
}
