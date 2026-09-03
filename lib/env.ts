/** Centralised env access with clear errors for missing required vars. */
function first(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}
function required(...names: string[]): string {
  const v = first(...names);
  if (!v) throw new Error(`Missing required environment variable: ${names[0]}`);
  return v;
}

/**
 * These are all server-only. The Supabase URL and anon key were previously
 * `NEXT_PUBLIC_*`; that prefix is no longer needed (the app has no browser-side
 * Supabase client). The old names are still read as a fallback so a partially
 * migrated deployment keeps working — remove the `NEXT_PUBLIC_*` vars from the
 * host once `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `APP_URL` are set.
 */
export const env = {
  supabaseUrl: () => required("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () =>
    required("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cronSecret: () => required("CRON_SECRET"),
  appUrl: () =>
    first("APP_URL", "NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
  resendKey: () => first("RESEND_API_KEY"),
  resendFrom: () => process.env.RESEND_FROM_EMAIL || "ec@example.com",
  anthropicKey: () => first("ANTHROPIC_API_KEY"),
  recallKey: () => first("RECALL_API_KEY"),
  recallWebhookSecret: () => first("RECALL_WEBHOOK_SECRET"),
};
