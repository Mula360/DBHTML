import { googleGet, getAccessToken } from "./auth";

const DRIVE = "https://www.googleapis.com/drive/v3";
const DOCS = "https://docs.googleapis.com/v1";

const ALLOWED_HOSTS = new Set(["docs.google.com", "drive.google.com"]);

/** Pull a Google Docs file id out of a user-pasted URL, host-allowlisted. */
export function docIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
  const m = parsed.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const q = parsed.searchParams.get("id");
  return q && /^[a-zA-Z0-9_-]+$/.test(q) ? q : null;
}

/** Find the most recent Gemini notes Doc for a meeting date. */
export async function findNotesDoc(
  folderId: string | null,
  dateIso: string,
  titleHint?: string,
): Promise<string | null> {
  const day = new Date(`${dateIso}T00:00:00Z`);
  const from = new Date(day.getTime() - 2 * 86400000).toISOString();
  const to = new Date(day.getTime() + 5 * 86400000).toISOString();
  const clauses = [
    "mimeType='application/vnd.google-apps.document'",
    "trashed=false",
    `createdTime>='${from}'`,
    `createdTime<='${to}'`,
  ];
  if (folderId) clauses.push(`'${folderId}' in parents`);
  if (titleHint) clauses.push(`name contains '${titleHint.replace(/'/g, "")}'`);
  const q = encodeURIComponent(clauses.join(" and "));
  const json = await googleGet<{ files?: { id: string }[] }>(
    `${DRIVE}/files?q=${q}&orderBy=createdTime desc&pageSize=5&fields=files(id,name,createdTime)`,
  );
  return json?.files?.[0]?.id ?? null;
}

interface DocElement {
  paragraph?: {
    elements?: { textRun?: { content?: string } }[];
  };
  table?: { tableRows?: { tableCells?: { content?: DocElement[] }[] }[] };
}

function flatten(content: DocElement[] | undefined): string {
  if (!content) return "";
  let out = "";
  for (const el of content) {
    if (el.paragraph?.elements) {
      for (const r of el.paragraph.elements) out += r.textRun?.content ?? "";
    }
    if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        for (const cell of row.tableCells ?? []) out += flatten(cell.content);
      }
    }
  }
  return out;
}

/** Plain text of a Google Doc by file id. */
export async function getDocText(fileId: string): Promise<string | null> {
  const json = await googleGet<{ body?: { content?: DocElement[] } }>(
    `${DOCS}/documents/${fileId}`,
  );
  if (!json) return null;
  return flatten(json.body?.content).trim();
}

/**
 * Fetch text from a pasted Doc URL. Host-allowlisted, no redirects, timeout —
 * this is a server-side fetch of a user-supplied URL (SSRF surface).
 */
export async function getDocTextFromUrl(url: string): Promise<string | null> {
  const id = docIdFromUrl(url);
  if (!id) return null;
  const token = await getAccessToken();
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${DOCS}/documents/${id}`, {
      headers: { authorization: `Bearer ${token}` },
      redirect: "error",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { body?: { content?: DocElement[] } };
    return flatten(json.body?.content).trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
