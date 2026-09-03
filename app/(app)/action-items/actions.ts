"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import {
  ACTION_STATUSES,
  ACTION_PRIORITIES,
  PORTFOLIO_TAGS,
  STATUS_NEXT,
  type ActionStatus,
} from "@/lib/constants";
import { notifyMember } from "@/lib/mailer";
import type { MemberRow } from "@/lib/database.types";

export interface FormResult {
  error?: string;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function createActionItem(
  _prev: FormResult,
  fd: FormData,
): Promise<FormResult> {
  const { member } = await getSessionMember();
  const supabase = createClient();

  const title = str(fd, "title");
  const assigned_to = str(fd, "assigned_to");
  if (!title) return { error: "Title is required." };
  if (!assigned_to) return { error: "Pick an assignee." };

  const priority = str(fd, "priority");
  const portfolio_tag = str(fd, "portfolio_tag");
  const due_date = str(fd, "due_date") || null;
  const source_meeting_id = str(fd, "source_meeting_id") || null;

  const { data, error } = await supabase
    .from("action_items")
    .insert({
      title,
      description: str(fd, "description") || null,
      assigned_to,
      due_date,
      priority: ACTION_PRIORITIES.includes(priority as never)
        ? priority
        : "Normal",
      portfolio_tag: PORTFOLIO_TAGS.includes(portfolio_tag as never)
        ? portfolio_tag
        : null,
      source_meeting_id,
      created_by: member.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (assigned_to !== member.id) {
    const { data: assignee } = await supabase
      .from("members")
      .select("*")
      .eq("id", assigned_to)
      .maybeSingle();
    if (assignee) {
      await notifyMember(supabase, assignee as MemberRow, {
        type: "action_assigned",
        title: `New action item: ${title}`,
        lines: [
          `${member.name} assigned you "${title}".`,
          due_date ? `Due ${due_date}.` : "No due date set.",
        ],
        link: `/action-items/${data.id}`,
      });
    }
  }

  redirect(`/action-items/${data.id}`);
}

export async function changeStatus(
  itemId: string,
  next: ActionStatus,
  droppedReason: string | null,
): Promise<FormResult> {
  if (!ACTION_STATUSES.includes(next)) return { error: "Unknown status." };
  const { member } = await getSessionMember();
  const supabase = createClient();

  const { data: item } = await supabase
    .from("action_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Not found." };

  const allowed = STATUS_NEXT[item.status] ?? [];
  if (!allowed.includes(next)) {
    return { error: `Cannot move from ${item.status} to ${next}.` };
  }
  if (next === "Dropped" && !droppedReason?.trim()) {
    return { error: "A reason is required to drop an item." };
  }

  const { error } = await supabase
    .from("action_items")
    .update({
      status: next,
      completed_at: next === "Done" ? new Date().toISOString() : null,
      dropped_reason: next === "Dropped" ? droppedReason!.trim() : null,
    })
    .eq("id", itemId);
  if (error) return { error: error.message };

  await supabase.from("action_comments").insert({
    action_item_id: itemId,
    member_id: member.id,
    comment: `Status changed to ${next}${
      next === "Dropped" ? ` — ${droppedReason!.trim()}` : ""
    }.`,
  });

  revalidatePath(`/action-items/${itemId}`);
  return {};
}

export async function addComment(
  itemId: string,
  comment: string,
): Promise<FormResult> {
  const trimmed = comment.trim();
  if (!trimmed) return { error: "Empty comment." };
  const { member } = await getSessionMember();
  const supabase = createClient();
  const { error } = await supabase.from("action_comments").insert({
    action_item_id: itemId,
    member_id: member.id,
    comment: trimmed,
  });
  if (error) return { error: error.message };
  revalidatePath(`/action-items/${itemId}`);
  return {};
}
