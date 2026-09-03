import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { istToday } from "@/lib/dates";
import { dueTone, TONE_CLASS } from "@/lib/actionItems";
import { STATUS_NEXT, prettyPortfolio } from "@/lib/constants";
import { hasPosition, OFFICERS } from "@/lib/auth";
import type {
  ActionItemRow,
  ActionCommentRow,
  MemberRow,
} from "@/lib/database.types";
import { StatusControls } from "./StatusControls";
import { CommentBox } from "./CommentBox";

export const dynamic = "force-dynamic";

export default async function ActionItemDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { member, position } = await getSessionMember();

  const { data: item } = await supabase
    .from("action_items")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!item) notFound();
  const row = item as ActionItemRow;

  const { data: everyone } = await supabase.from("members").select("id, name");
  const names = new Map(
    (everyone ?? []).map((m) => [m.id, (m as MemberRow).name]),
  );

  const { data: comments } = await supabase
    .from("action_comments")
    .select("*")
    .eq("action_item_id", params.id)
    .order("created_at", { ascending: true });

  const canEdit =
    row.assigned_to === member.id ||
    row.created_by === member.id ||
    hasPosition(position, OFFICERS);
  const today = istToday();
  const tone = dueTone(row, today);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <Link href="/action-items" style={{ fontSize: 13 }}>
        ← All action items
      </Link>
      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 22 }}>{row.title}</h1>
        {row.description && <p style={{ color: "#445" }}>{row.description}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span className="badge">{row.status}</span>
          <span className={`badge ${TONE_CLASS[tone]}`}>
            Due {row.due_date ?? "—"}
          </span>
          <span className="badge">{row.priority}</span>
          {row.portfolio_tag && (
            <span className="badge">{prettyPortfolio(row.portfolio_tag)}</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "#667" }}>
          Assigned to <b>{names.get(row.assigned_to) ?? "—"}</b>
          {row.created_by && ` · created by ${names.get(row.created_by) ?? "—"}`}
          {row.source_meeting_id && " · from a meeting"}
        </p>
        {row.status === "Dropped" && row.dropped_reason && (
          <p className="card rag-amber" style={{ fontSize: 13 }}>
            Dropped: {row.dropped_reason}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Change status</h3>
          <StatusControls
            itemId={row.id}
            current={row.status}
            options={STATUS_NEXT[row.status] ?? []}
          />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Activity & comments</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {(comments ?? []).map((c) => {
            const cc = c as ActionCommentRow;
            return (
              <div
                key={cc.id}
                style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}
              >
                <div style={{ fontSize: 13 }}>{cc.comment}</div>
                <div style={{ fontSize: 12, color: "#889" }}>
                  {names.get(cc.member_id) ?? "—"} ·{" "}
                  {new Date(cc.created_at).toLocaleString("en-IN")}
                </div>
              </div>
            );
          })}
          {(comments ?? []).length === 0 && (
            <p style={{ color: "#889", fontSize: 14 }}>No activity yet.</p>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <CommentBox itemId={row.id} />
        </div>
      </div>
    </div>
  );
}
