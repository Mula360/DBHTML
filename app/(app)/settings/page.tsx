import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { getWorkspaceConfig } from "@/lib/google/config";
import { googleConfigured } from "@/lib/google/auth";
import { PageHead, SectionLabel } from "@/components/ui";
import { ProfileForm, ComplianceForm, MeetingsWorkspaceForm } from "./forms";
import type { MemberRow, CronRunRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = createClient();
  const { member, position } = await getSessionMember();
  const { data: fresh } = await db
    .from("members")
    .select("*")
    .eq("id", member.id)
    .single();
  const me = fresh as MemberRow;
  const isOfficer = hasPosition(position, OFFICERS);
  const config = isOfficer ? await getCurrentConfig(db) : null;

  const { data: audit } = isOfficer
    ? await db
        .from("compliance_config_audit")
        .select("field_name, old_value, new_value, changed_at")
        .order("changed_at", { ascending: false })
        .limit(10)
    : { data: null };

  const ws = isOfficer ? await getWorkspaceConfig(db) : null;
  const { data: runsRaw } = isOfficer
    ? await db
        .from("cron_runs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(10)
    : { data: null };
  const runs = (runsRaw ?? []) as CronRunRow[];

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHead title="Settings" sub={`${me.name} · ${me.email} · ${position ?? "no position"}`} />

      <SectionLabel>My profile</SectionLabel>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <ProfileForm
          phone={me.phone ?? ""}
          ebird={me.ebird_username ?? ""}
          avatar={me.avatar_url ?? ""}
          googleEmail={me.google_email ?? ""}
        />
      </div>

      {isOfficer && ws && (
        <>
          <SectionLabel>Meetings &amp; Google Workspace</SectionLabel>
          <div className="card" style={{ display: "grid", gap: 12 }}>
            <MeetingsWorkspaceForm
              meetCode={ws.meet_space_code ?? ""}
              notesFolderId={ws.notes_folder_id ?? ""}
              autoIngest={ws.auto_ingest_enabled}
              attendanceFraction={ws.attendance_fraction}
              googleReady={googleConfigured()}
            />
          </div>
        </>
      )}

      {isOfficer && runs.length > 0 && (
        <>
          <SectionLabel>Recent scheduled runs</SectionLabel>
          <div className="card" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            {runs.map((r) => (
              <div key={r.id}>
                {new Date(r.ran_at).toLocaleString("en-IN")} · {r.tasks_ran.length}{" "}
                tasks · {r.duration_ms ?? "?"}ms
                {Object.keys(r.errors ?? {}).length > 0
                  ? ` · errors: ${Object.keys(r.errors).join(", ")}`
                  : ""}
              </div>
            ))}
          </div>
        </>
      )}

      {isOfficer && config && (
        <>
          <SectionLabel>Baseline minimums &amp; rules</SectionLabel>
          <div className="card" style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>
            Every RAG colour in the portal is driven by these. Changes are
            audit-logged and take effect immediately.
          </p>
          <ComplianceForm config={config} />
          {audit && audit.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              <b>Recent changes:</b>
              {audit.map((a, i) => (
                <div key={i}>
                  {a.field_name}: {a.old_value} → {a.new_value} (
                  {new Date(a.changed_at).toLocaleDateString("en-IN")})
                </div>
              ))}
            </div>
          )}
          </div>
        </>
      )}

      {!isOfficer && (
        <>
          <SectionLabel>Baseline minimums</SectionLabel>
          <div className="card muted" style={{ fontSize: 12.5 }}>
            Managed by the President and Secretary. See the current values on the{" "}
            <a href="/compliance">Compliance page</a>.
          </div>
        </>
      )}

      <SectionLabel>Session</SectionLabel>
      <div className="card">
        <form action="/logout" method="post">
          <button className="btn secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
