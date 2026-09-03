/** Centralised env access with clear errors for missing required vars. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cronSecret: () => required("CRON_SECRET"),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  resendKey: () => optional("RESEND_API_KEY"),
  resendFrom: () => process.env.RESEND_FROM_EMAIL || "ec@example.com",
  anthropicKey: () => optional("ANTHROPIC_API_KEY"),
  recallKey: () => optional("RECALL_API_KEY"),
  recallWebhookSecret: () => optional("RECALL_WEBHOOK_SECRET"),
};
