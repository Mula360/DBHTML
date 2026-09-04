import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const envVal = (...names: string[]) => {
  for (const n of names) if (process.env[n]) return process.env[n]!;
  return undefined;
};

/**
 * Ops diagnostic. Reports whether the deployment can reach Supabase with its
 * service-role key. Exposes only the (already public) Supabase URL and a row
 * count — never a key or member data. Safe to leave in place.
 *
 *   GET /api/health
 */
export async function GET() {
  const url = envVal("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") ?? null;
  const anonKeyVal = envVal("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonPresent = Boolean(anonKeyVal);
  const servicePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const decodeRef = (jwt?: string) => {
    try {
      return JSON.parse(
        Buffer.from((jwt ?? "").split(".")[1] ?? "", "base64").toString(),
      ) as { ref?: string; role?: string };
    } catch {
      return null;
    }
  };
  const anon = decodeRef(anonKeyVal);
  const svc = decodeRef(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let membersVisible: number | null = null;
  let dbError: string | null = null;
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from("members")
      .select("id", { count: "exact", head: true });
    if (error) dbError = error.message;
    else membersVisible = count ?? 0;
  } catch (e) {
    dbError = (e as Error).message;
  }

  const projectRefFromUrl = url
    ? new URL(url).host.split(".")[0]
    : null;

  return NextResponse.json({
    ok: dbError === null && membersVisible !== null,
    supabaseUrl: url,
    projectRef: projectRefFromUrl,
    anonKey: { present: anonPresent, role: anon?.role ?? null, ref: anon?.ref ?? null },
    serviceKey: { present: servicePresent, role: svc?.role ?? null, ref: svc?.ref ?? null },
    refsMatch:
      projectRefFromUrl != null &&
      anon?.ref === projectRefFromUrl &&
      svc?.ref === projectRefFromUrl,
    membersVisible,
    google: {
      serviceAccount: Boolean(process.env.GOOGLE_SA_KEY_JSON),
      impersonateSubject: Boolean(process.env.GOOGLE_IMPERSONATE_SUBJECT),
      meetSpaceCode: Boolean(process.env.GOOGLE_MEET_SPACE_CODE),
    },
    passwordLoginEnabled:
      (process.env.ALLOW_PASSWORD_LOGIN || "").toLowerCase() !== "false",
    dbError,
    hint:
      dbError !== null
        ? "The service-role key can't read the members table. Check SUPABASE_SERVICE_ROLE_KEY is the service_role key (not anon), for THIS project, with no trailing whitespace — then redeploy."
        : membersVisible === 0
          ? "Connected, but the members table is empty — wrong project, or the seed hasn't run."
          : "Healthy.",
  });
}
