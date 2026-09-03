"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LoginState {
  ok: boolean;
  message: string;
}

const NOT_MEMBER_MSG =
  "This app is for Deccan Birders EC members. Ask the Secretary to add your email.";

/** Magic-link login, gated to emails present in the members table. */
export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  // Pre-check against the members table with the service role so unknown
  // emails never receive a link (and never get a session on callback).
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    // Deliberately the same wording as the callback rejection.
    return { ok: false, message: NOT_MEMBER_MSG };
  }

  const origin = headers().get("origin") ?? "http://localhost:3000";
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: `Check ${email} for a sign-in link. It expires in 1 hour.`,
  };
}

/**
 * Email + password login. Only works for accounts that have a password set
 * (the demo/test accounts) — members who only use magic links have none, so
 * this path simply fails for them. Same members-only gate as the magic link.
 */
export async function passwordSignIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (!member) return { ok: false, message: NOT_MEMBER_MSG };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { ok: false, message: "Wrong email or password." };
  }

  if (member.auth_id !== data.user.id) {
    await admin
      .from("members")
      .update({ auth_id: data.user.id })
      .eq("id", member.id);
  }

  redirect("/dashboard");
}
