"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/portfolios";
import type { DocumentRow } from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const CATEGORIES: DocumentRow["category"][] = [
  "ByeLaws",
  "MoMArchive",
  "Finance",
  "HBA",
  "AWC",
  "Handover",
  "Other",
];

export async function addDocument(_p: Result, fd: FormData): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const title = s(fd, "title");
  const url = s(fd, "url");
  const category = s(fd, "category") as DocumentRow["category"];
  if (!title || !url) return { error: "Title and URL are required." };
  if (!CATEGORIES.includes(category)) return { error: "Pick a category." };

  const term = await getCurrentTerm(db);
  const { error } = await db.from("documents").insert({
    title,
    url,
    category,
    added_by: member.id,
    term_id: term?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the Secretary or President can delete documents." };
  const db = createClient();
  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/documents");
  return { ok: true };
}
