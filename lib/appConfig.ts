import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export async function getConfig<T = unknown>(
  db: DB,
  key: string,
): Promise<T | null> {
  const { data } = await db
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value ?? null) as T | null;
}

export async function setConfig(
  db: DB,
  key: string,
  value: unknown,
  memberId: string,
): Promise<void> {
  await db.from("app_config").upsert(
    {
      key,
      value: value as never,
      updated_by: memberId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
}

export interface LoginHero {
  title: string;
  subtitle: string;
}
