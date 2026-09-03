import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { PageHead, Pill } from "@/components/ui";
import { MarkAllRead } from "./ui";
import type { NotificationRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const db = createClient();
  await getSessionMember();

  const { data } = await db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as NotificationRow[];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div className="stack">
      <PageHead
        title="Notifications"
        sub={`${unread} unread · every reminder and digest also lands here`}
        actions={unread > 0 ? <MarkAllRead /> : undefined}
      />

      <div className="card flush">
        {rows.length === 0 && (
          <div style={{ padding: 18 }} className="muted">
            Nothing yet.
          </div>
        )}
        {rows.map((n) => (
          <Link
            key={n.id}
            href={n.link || "/dashboard"}
            style={{
              display: "flex",
              gap: 12,
              padding: "13px 18px",
              borderBottom: "1px solid #f2f6f8",
              background: n.read_at ? "#fff" : "var(--tint-blue)",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: n.read_at ? "var(--line-soft)" : "var(--blue)",
                marginTop: 5,
                flex: "none",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
                {n.body}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>
                {n.type && <Pill>{n.type}</Pill>}{" "}
                {new Date(n.created_at).toLocaleString("en-IN")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
