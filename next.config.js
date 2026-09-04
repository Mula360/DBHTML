/** @type {import('next').NextConfig} */

const supabaseHost = (() => {
  try {
    return new URL(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    ).origin;
  } catch {
    return "";
  }
})();

const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js injects a small inline bootstrap script; styles are inline too.
  // 'unsafe-eval' is dev-only (React Fast Refresh); production has no eval.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: ${supabaseHost}`.trim(),
  `connect-src 'self' ${supabaseHost}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
