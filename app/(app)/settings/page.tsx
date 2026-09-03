import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { PageHead, SectionLabel } from "@/components/ui";
import { ProfileForm, ComplianceForm } from "./forms";
import type { MemberRow } from "@/lib/database.types";

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

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHead title="Settings" sub={`${me.name} · ${me.email} · ${position ?? "no position"}`} />

      <SectionLabel>My profile</SectionLabel>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <ProfileForm
          phone={me.phone ?? ""}
          ebird={me.ebird_username ?? ""}
          avatar={me.avatar_url ?? ""}
        />
      </div>

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
