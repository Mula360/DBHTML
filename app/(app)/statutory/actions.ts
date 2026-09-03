"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/portfolios";
import type { PositionName, StatutoryItemRow } from "@/lib/database.types";

const ALLOWED: PositionName[] = ["Secretary", "President", "Treasurer"];

export interface Result {
  error?: string;
  ok?: boolean;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function guard() {
  const { position } = await getSessionMember();
  if (!hasPosition(position, ALLOWED))
    throw new Error("Secretary, President or Treasurer only.");
}

export async function createStatutoryItem(
  _p: Result,
  fd: FormData,
): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const title = s(fd, "title");
  if (!title) return { error: "Title is required." };
  const term = await getCurrentTerm(db);
  const { error } = await db.from("statutory_items").insert({
    title,
    authority: s(fd, "authority") || null,
    due_date: s(fd, "due_date") || null,
    document_url: s(fd, "document_url") || null,
    recurring_yearly: fd.get("recurring_yearly") === "on",
    term_id: term?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/statutory");
  return { ok: true };
}

export async function setStatutoryStatus(
  id: string,
  status: StatutoryItemRow["status"],
): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const { error } = await db
    .from("statutory_items")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/statutory");
  return { ok: true };
}

export async function deleteStatutoryItem(id: string): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const { error } = await db.from("statutory_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/statutory");
  return { ok: true };
}
