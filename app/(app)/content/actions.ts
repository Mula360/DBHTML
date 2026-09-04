"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { setConfig } from "@/lib/appConfig";

export interface Result {
  error?: string;
  ok?: boolean;
  message?: string;
}

const CATEGORIES = ["field_note", "from_the_hide", "on_birding"] as const;
type Category = (typeof CATEGORIES)[number];

async function gate(): Promise<{ memberId: string } | { error: string }> {
  const { member, position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the President or Secretary can edit login content." };
  return { memberId: member.id };
}

export async function updateLoginHero(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const title = String(fd.get("title") ?? "").trim();
  const subtitle = String(fd.get("subtitle") ?? "").trim();
  if (!title || !subtitle) return { error: "Title and subtitle are required." };
  await setConfig(createClient(), "login_hero", { title, subtitle }, g.memberId);
  revalidatePath("/content");
  return { ok: true, message: "Hero text saved." };
}

export async function saveContentEntry(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const category = String(fd.get("category") ?? "") as Category;
  if (!CATEGORIES.includes(category)) return { error: "Unknown category." };
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Text is required." };
  const attribution = String(fd.get("attribution") ?? "").trim() || null;
  const id = String(fd.get("id") ?? "").trim();
  const db = createClient();

  if (id) {
    const { error } = await db
      .from("content_entries")
      .update({ body, attribution, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: last } = await db
      .from("content_entries")
      .select("sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("content_entries").insert({
      category,
      body,
      attribution,
      sort_order: (last?.sort_order ?? -1) + 1,
      created_by: g.memberId,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/content");
  return { ok: true };
}

export async function setEntryActive(
  id: string,
  active: boolean,
): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const { error } = await createClient()
    .from("content_entries")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content");
  return { ok: true };
}

export async function deleteContentEntry(id: string): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const { error } = await createClient()
    .from("content_entries")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content");
  return { ok: true };
}

export async function reorderContent(
  id: string,
  direction: "up" | "down",
): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const db = createClient();
  const { data: row } = await db
    .from("content_entries")
    .select("id, category, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Not found." };
  const { data: neighbour } = await db
    .from("content_entries")
    .select("id, sort_order")
    .eq("category", row.category)
    [direction === "up" ? "lt" : "gt"]("sort_order", row.sort_order)
    .order("sort_order", { ascending: direction === "down" })
    .limit(1)
    .maybeSingle();
  if (!neighbour) return { ok: true };
  await db
    .from("content_entries")
    .update({ sort_order: neighbour.sort_order })
    .eq("id", row.id);
  await db
    .from("content_entries")
    .update({ sort_order: row.sort_order })
    .eq("id", neighbour.id);
  revalidatePath("/content");
  return { ok: true };
}

const ALLOWED_IMAGE = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Sniff the real type from magic bytes — do not trust the declared mime. */
function sniff(buf: Uint8Array): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

export async function uploadCollageImage(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose an image file." };
  if (file.size > 2 * 1024 * 1024) return { error: "Max size is 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const real = sniff(bytes);
  if (!real || !ALLOWED_IMAGE.has(real))
    return { error: "Only PNG, JPEG or WebP images are allowed." };

  const ext = real.split("/")[1].replace("jpeg", "jpg");
  const path = `collage/${randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("public-assets")
    .upload(path, bytes, { contentType: real, upsert: false });
  if (upErr) return { error: upErr.message };

  const db = createClient();
  const { data: last } = await db
    .from("collage_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from("collage_images").insert({
    storage_path: path,
    alt: String(fd.get("alt") ?? "").trim() || null,
    sort_order: (last?.sort_order ?? -1) + 1,
    created_by: g.memberId,
  });
  if (error) return { error: error.message };
  revalidatePath("/content");
  return { ok: true, message: "Image added." };
}

export async function deleteCollageImage(id: string): Promise<Result> {
  const g = await gate();
  if ("error" in g) return g;
  const db = createClient();
  const { data: row } = await db
    .from("collage_images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.storage_path) {
    await createAdminClient()
      .storage.from("public-assets")
      .remove([row.storage_path]);
  }
  const { error } = await db.from("collage_images").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content");
  return { ok: true };
}
