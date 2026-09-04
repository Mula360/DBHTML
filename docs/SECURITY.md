# Security & data protection — Deccan Birders EC Portal

Last reviewed: 2026-09-04 (Google Workspace integration + hardening pass).

## 1. Assets & threat model

| Asset | Sensitivity | Where |
|---|---|---|
| EC member PII (name, email, phone, Google email) | Medium | `members` |
| General membership register (~570 people: name, email, phone, renewal dates) | **High** (bulk PII) | `society_members` — RLS position-restricted |
| Meeting minutes, decisions, notes text | Medium | `meetings`, `moms` |
| Meeting attendance + per-person Meet durations | Medium (behavioural PII) | `meeting_attendance` |
| Expense claims | Medium (financial) | `expense_claims` — owner + Treasurer only |
| Supabase `service_role` key, Google SA key, `CRON_SECRET` | **Critical** | Vercel env, server-only |

Primary threats: credential theft / brute force, broken authorization (IDOR, privilege
escalation past the hidden UI), SSRF via the notes-link import, XSS on the pre-auth login page,
secret leakage, supply-chain.

## 2. Authentication & session

- **Magic-link (OTP)** is the only production sign-in. Password sign-in exists for
  test/staging accounts and is gated by `ALLOW_PASSWORD_LOGIN` (default `false`); when off the
  server action refuses and the login UI hides the toggle.
- Members-only gate: `requestMagicLink` / `passwordSignIn` pre-check the `members` table with the
  service-role client, so unknown emails never receive a link or a session. The "not a member"
  message is **identical** for both flows and for the auth callback — no user enumeration.
- **Rate limiting** (`lib/rate-limit.ts` + `auth_attempts` table): > 5 failed attempts in 15 min
  per email **or** per client-IP hash → blocked with a generic retry message. IPs are stored
  only as a truncated SHA-256, never raw.
- Session cookies are managed by `@supabase/ssr` (`Secure`, `HttpOnly`, `SameSite=Lax`).
  Middleware runs the authoritative `supabase.auth.getUser()` on every private route; page code
  uses local `getClaims()` for speed but never as the sole gate.
- **User actions:** enable Supabase Auth "leaked password protection"; set OTP expiry ≤ 1 h;
  restrict redirect URLs to `https://dbhtml.vercel.app/**` exactly. Consider TOTP MFA for
  officers.

## 3. Authorization (RLS + server-action re-checks)

- RLS is enabled on **every** public table. Helpers: `auth_member_id()`, `get_my_position()`,
  `has_position()`, `is_officer()`, `can_manage_register()` (`0002_rls.sql`).
- New tables: `app_config` / `content_entries` / `collage_images` — world-readable to
  authenticated members, writes gated `is_officer()`. `cron_runs` — officer read only.
  `auth_attempts` — no client policy at all (service-role only).
- Storage bucket `public-assets` — public `select`; `insert/update/delete` gated `is_officer()`.
- **Every** officer/treasurer/register server action re-checks `hasPosition(position, …)`
  server-side; the hidden nav item is not the control. `scripts/verify-auth-rls.mjs` should POST
  each mutating action as a plain member and assert rejection (extend before go-live).

### `createAdminClient()` (bypasses RLS) — call-site inventory

| Call site | Purpose | Safe because |
|---|---|---|
| `app/auth/callback` | link `auth_id` after OTP | server route, no user input beyond the verified session |
| `app/login/actions.ts` | members pre-check, rate-limit reads/writes | read-only lookups + append-only `auth_attempts` |
| `app/login/page.tsx` (`loadContent`) | read login CMS content pre-auth | **read-only** projection of officer-authored copy |
| `lib/cron/*` (dispatcher, googleMeet) | scheduled writes | reached only via `/api/cron/daily` (Bearer + `x-vercel-cron`) |
| `lib/rate-limit.ts` | `auth_attempts` | append-only, no PII beyond hashed IP + email |
| `app/(app)/content/actions.ts` `uploadCollageImage` / `deleteCollageImage` | Storage upload/remove | officer-gated at the top of the action |

Never import `createAdminClient` into a client component.

## 4. Input validation & injection

- All server actions coerce/validate `FormData` before any DB write (numeric ranges on config,
  email shape on `google_email`, category allowlist on content, fraction 0–1).
- **SSRF** — `importNotesFromLink` → `docIdFromUrl()` requires `https:` and host ∈
  {`docs.google.com`, `drive.google.com`}; the fetch uses `redirect: "error"` and a 10 s
  timeout. Unit-tested (`tests/meetings.test.ts`).
- **Prompt injection** — meeting notes are attacker-influenceable text fed to Claude. Impact is
  bounded: output is a *Draft* MoM the Secretary reviews and approves; extracted text is never
  executed. The system prompt explicitly says to ignore instructions in the notes.
- **XSS** — `content_entries` / hero text / collage `alt` render on the **public** login page.
  React escapes by default; there is **no `dangerouslySetInnerHTML`** anywhere. CSP (below)
  blocks injected inline `<script>`.
- **Storage upload** — `uploadCollageImage` sniffs magic bytes (not the declared mime), rejects
  SVG, caps at 2 MB, and writes to a random UUID path (`upsert:false`) so a crafted filename
  cannot traverse or overwrite.

## 5. Transport & headers (`next.config.js`)

`Content-Security-Policy` (`default-src 'self'`; `script-src 'self' 'unsafe-inline'`;
`img-src 'self' data: <supabase-origin>`; `connect-src 'self' <supabase-origin>`;
`frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`),
`Strict-Transport-Security` (2 y, preload), `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera/mic/geo/topics denied).

CSRF: Next.js 14.2 server actions validate the `Origin` header against the host — all forms are
same-origin.

## 6. Secrets

| Secret | Store | Action |
|---|---|---|
| Supabase `service_role` key | Vercel env | **ROTATE** — pasted in chat across sessions |
| Supabase DB password | — | **ROTATE** — pasted in chat |
| `GOOGLE_SA_KEY_JSON` | Vercel env | new; read-only scopes only; never logged |
| `CRON_SECRET` | Vercel env | ensure long/random |
| GitHub PAT (pushes) | — | **REVOKE** — in chat history |

`/api/health` reports only presence booleans + key *role/ref* (decoded from the public JWT
claims) — never a key value or member data.

## 7. Data protection (DPDP Act 2023)

- **Lawful basis:** legitimate interest of the society in running its Executive Committee; the
  general register is processed for membership administration.
- **Minimisation:** from Google Meet the app stores only `member_id`, `minutes_present`, and a
  status — never raw Google participant objects. Cron/action logs must not contain member names
  or emails (`cron_runs.errors` holds task name + message only).
- **Retention:** purge PII of departed members and closed-term working data after a defined
  period (recommend 3 years). No automated job yet — manual, documented here.
- **Data-principal rights:** access / correction / erasure requests handled manually by the
  Secretary against `members` + `society_members` + `meeting_attendance` + `expense_claims`.
- **Google's own ~30-day retention** of conference records auto-minimises at source.
- `meetings.notes_text` may contain sensitive discussion; it is readable by all EC members
  (acceptable for an EC tool). Move to officer-only if discussions become sensitive.

## 8. Attack scenarios — test checklist (record results here)

| Scenario | Expected | Result |
|---|---|---|
| 6th failed login in 15 min | throttled, generic message | _pending_ |
| Unknown email, magic-link vs password | identical message | _pending_ |
| Plain member GETs `/reports/member/<other-id>` | read allowed (EC tool), no writes | _pending_ |
| Plain member POSTs `updateComplianceConfig` / `uploadCollageImage` directly | rejected server-side | _pending_ |
| `importNotesFromLink` with `http://169.254.169.254/…` | rejected | ✅ unit test |
| Non-officer `storage.upload` to `public-assets` | RLS denies | _pending_ |
| Anon `select` on every table / bucket | denied except `public-assets` read | _pending_ |
| Forged / expired JWT on a private route | redirect to `/login` | _pending_ |
| Injected `<script>` in a content entry rendered on `/login` | CSP blocks; React escapes | _pending_ |

## 9. Incident response & backup

- **Contacts:** Secretary (primary), President (secondary).
- **Backup:** confirm Supabase PITR / daily backups on the plan. Restore = Supabase dashboard →
  Database → Backups → restore to a new project, repoint `SUPABASE_URL`, redeploy.
- On suspected key compromise: rotate the affected key in Supabase/Google, update Vercel env,
  redeploy, review `cron_runs` + Supabase logs for anomalies.
