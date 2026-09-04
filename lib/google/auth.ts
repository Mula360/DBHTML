import { createSign } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Domain-wide-delegation service-account auth, dependency-free.
 * Builds and signs a JWT assertion, exchanges it for an access token that
 * impersonates GOOGLE_IMPERSONATE_SUBJECT. Returns null when the service
 * account key / subject are not configured — every caller treats that as
 * "Google integration is off, stay in manual mode".
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cached: { token: string; expiresAt: number } | null = null;

function readKey(): ServiceAccountKey | null {
  const raw = env.googleSaKeyJson();
  const subject = env.googleImpersonateSubject();
  if (!raw || !subject) return null;
  try {
    const key = JSON.parse(raw) as ServiceAccountKey;
    if (!key.client_email || !key.private_key) return null;
    return key;
  } catch {
    return null;
  }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
].join(" ");

export function googleConfigured(): boolean {
  return readKey() !== null;
}

/** Access token impersonating the configured subject, cached until ~expiry. */
export async function getAccessToken(): Promise<string | null> {
  const key = readKey();
  const subject = env.googleImpersonateSubject();
  if (!key || !subject) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      sub: subject,
      scope: SCOPES,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signature = b64url(
    createSign("RSA-SHA256")
      .update(signingInput)
      .sign(key.private_key.replace(/\\n/g, "\n")),
  );
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error("[google] token exchange failed:", res.status);
    return null;
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;
  cached = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  };
  return cached.token;
}

/** Authenticated GET against a Google API, or null when unavailable. */
export async function googleGet<T>(url: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[google] GET failed:", url.split("?")[0], res.status);
    return null;
  }
  return (await res.json()) as T;
}
