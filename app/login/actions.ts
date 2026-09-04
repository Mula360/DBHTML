"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { checkAuthRate, recordAuthAttempt } from "@/lib/rate-limit";

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

  const rate = await checkAuthRate(email, "magic_link");
  if (rate.blocked) {
    return {
      ok: false,
      message: `Too many attempts. Try again in about ${rate.retryInMinutes} minutes.`,
    };
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
    await recordAuthAttempt(email, "magic_link", false);
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
  await recordAuthAttempt(email, "magic_link", true);
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
  if (!env.allowPasswordLogin()) {
    return { ok: false, message: "Password sign-in is disabled." };
  }
  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  const rate = await checkAuthRate(email, "password");
  if (rate.blocked) {
    return {
      ok: false,
      message: `Too many attempts. Try again in about ${rate.retryInMinutes} minutes.`,
    };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (!member) {
    await recordAuthAttempt(email, "password", false);
    return { ok: false, message: NOT_MEMBER_MSG };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    await recordAuthAttempt(email, "password", false);
    return { ok: false, message: "Wrong email or password." };
  }
  await recordAuthAttempt(email, "password", true);

  if (member.auth_id !== data.user.id) {
    await admin
      .from("members")
      .update({ auth_id: data.user.id })
      .eq("id", member.id);
  }

  redirect("/dashboard");
}
