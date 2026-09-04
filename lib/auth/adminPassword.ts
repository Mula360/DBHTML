import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Set (or create) the Supabase Auth password for a member's email, and
 * return the auth user id so it can be linked onto members.auth_id.
 * Handles the case where an auth user already exists for that email (e.g.
 * they'd previously only ever used magic-link) by updating it instead.
 */
export async function setAuthPassword(
  email: string,
  password: string,
): Promise<{ authId: string } | { error: string }> {
  const admin = createAdminClient();
  const lower = email.trim().toLowerCase();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: lower,
      password,
      email_confirm: true,
    });
  if (!createErr && created.user) return { authId: created.user.id };

  // Already registered — find and update instead. listUsers is paginated;
  // the committee is small enough (tens of members) that one page covers it.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) return { error: listErr.message };
  const existing = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === lower,
  );
  if (!existing) return { error: createErr?.message ?? "Could not create the account." };

  const { data: updated, error: updateErr } =
    await admin.auth.admin.updateUserById(existing.id, { password });
  if (updateErr) return { error: updateErr.message };
  return { authId: updated.user.id };
}
