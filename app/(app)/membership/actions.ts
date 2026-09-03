"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, REGISTER_MANAGERS } from "@/lib/auth";
import { istToday } from "@/lib/dates";
import { computeStatus } from "@/lib/cron/tasks/societyMembers";
import type { SocietyMemberRow } from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
  message?: string;
}

async function guard() {
  const { position } = await getSessionMember();
  if (!hasPosition(position, REGISTER_MANAGERS))
    throw new Error("Not permitted to manage the membership register.");
}

export async function markRenewed(id: string): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const today = istToday();
  const [y, m, d] = today.split("-").map(Number);
  const due = `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const { error } = await db
    .from("society_members")
    .update({
      last_renewal_date: today,
      renewal_due_date: due,
      status: "Active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/membership");
  return { ok: true };
}

export async function softDelete(id: string): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const { error } = await db
    .from("society_members")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/membership");
  return { ok: true };
}

export interface ImportRow {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  membership_type?: string;
  membership_number?: string;
  joined_date?: string;
  last_renewal_date?: string;
  renewal_due_date?: string;
}

export async function importMembers(rows: ImportRow[]): Promise<Result> {
  try {
    await guard();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const db = createClient();
  const today = istToday();
  const clean = rows
    .filter((r) => r.name?.trim())
    .map((r) => {
      const base = {
        name: r.name.trim(),
        email: r.email?.trim() || null,
        phone: r.phone?.trim() || null,
        city: r.city?.trim() || null,
        membership_type: r.membership_type?.trim() || null,
        membership_number: r.membership_number?.trim() || null,
        joined_date: r.joined_date?.trim() || null,
        last_renewal_date: r.last_renewal_date?.trim() || null,
        renewal_due_date: r.renewal_due_date?.trim() || null,
      };
      const status =
        computeStatus(base as Pick<SocietyMemberRow, "membership_type" | "renewal_due_date">, today) ??
        "Active";
      return { ...base, status };
    });
  if (clean.length === 0) return { error: "No valid rows to import." };

  // insert in chunks
  let inserted = 0;
  for (let i = 0; i < clean.length; i += 200) {
    const chunk = clean.slice(i, i + 200);
    const { error } = await db.from("society_members").insert(chunk);
    if (error) return { error: `Row ${i}: ${error.message}` };
    inserted += chunk.length;
  }
  revalidatePath("/membership");
  return { ok: true, message: `Imported ${inserted} members.` };
}
