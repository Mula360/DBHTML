import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server contexts:
 * the cron dispatcher, the auth callback (linking auth_id), and webhooks.
 * Never import this into a React component or a route reachable by members.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.supabaseUrl(),
    env.supabaseServiceKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
