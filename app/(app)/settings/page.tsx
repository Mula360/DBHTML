import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentConfig } from "@/lib/compliance-compute";
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
    <div style={{ display: "grid", gap: 20, maxWidth: 640 }}>
      <h1>Settings</h1>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h3>My profile</h3>
        <p style={{ fontSize: 13, color: "#667" }}>
          {me.name} · {me.email} · {position ?? "no position"}
        </p>
        <ProfileForm
          phone={me.phone ?? ""}
          ebird={me.ebird_username ?? ""}
          avatar={me.avatar_url ?? ""}
        />
      </section>

      {isOfficer && config && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h3>Baseline minimums &amp; rules</h3>
          <p style={{ fontSize: 13, color: "#667" }}>
            Every RAG colour in the portal is driven by these. Changes are
            audit-logged and take effect immediately.
          </p>
          <ComplianceForm config={config} />
          {audit && audit.length > 0 && (
            <div style={{ fontSize: 12, color: "#889" }}>
              <b>Recent changes:</b>
              {audit.map((a, i) => (
                <div key={i}>
                  {a.field_name}: {a.old_value} → {a.new_value} (
                  {new Date(a.changed_at).toLocaleDateString("en-IN")})
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!isOfficer && (
        <section className="card">
          <h3>Baseline minimums</h3>
          <p style={{ fontSize: 13, color: "#667" }}>
            Managed by the President and Secretary. See the current values on the{" "}
            <a href="/compliance">Compliance page</a>.
          </p>
        </section>
      )}
    </div>
  );
}
