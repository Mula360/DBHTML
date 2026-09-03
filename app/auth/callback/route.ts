import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Magic-link callback. Exchanges the code for a session, then enforces the
 * members-only rule: unknown emails are signed straight back out and bounced
 * to /login?error=not_member. Known members get auth_id linked on first login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const email = data.user.email.toLowerCase();
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, auth_id, is_active")
    .eq("email", email)
    .maybeSingle();

  if (!member || !member.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_member`);
  }

  if (member.auth_id !== data.user.id) {
    await admin
      .from("members")
      .update({ auth_id: data.user.id })
      .eq("id", member.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
