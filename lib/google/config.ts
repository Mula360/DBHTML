import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

type DB = SupabaseClient<Database>;

export interface WorkspaceConfig {
  meet_space_code: string | null;
  notes_folder_id: string | null;
  auto_ingest_enabled: boolean;
  attendance_fraction: number;
}

const DEFAULTS: WorkspaceConfig = {
  meet_space_code: null,
  notes_folder_id: null,
  auto_ingest_enabled: true,
  attendance_fraction: 0.5,
};

/** Read app_config.meetings_workspace, falling back to env vars then defaults. */
export async function getWorkspaceConfig(db: DB): Promise<WorkspaceConfig> {
  const { data } = await db
    .from("app_config")
    .select("value")
    .eq("key", "meetings_workspace")
    .maybeSingle();
  const stored = (data?.value ?? {}) as Partial<WorkspaceConfig>;
  return {
    meet_space_code:
      stored.meet_space_code || env.googleMeetSpaceCode() || null,
    notes_folder_id:
      stored.notes_folder_id || env.googleNotesFolderId() || null,
    auto_ingest_enabled: stored.auto_ingest_enabled ?? DEFAULTS.auto_ingest_enabled,
    attendance_fraction:
      typeof stored.attendance_fraction === "number"
        ? stored.attendance_fraction
        : DEFAULTS.attendance_fraction,
  };
}

export async function setWorkspaceConfig(
  db: DB,
  patch: Partial<WorkspaceConfig>,
  memberId: string,
): Promise<void> {
  const current = await getWorkspaceConfig(db);
  await db.from("app_config").upsert(
    {
      key: "meetings_workspace",
      value: { ...current, ...patch },
      updated_by: memberId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
}
