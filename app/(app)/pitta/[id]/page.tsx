import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import type {
  PittaIssueRow,
  PittaContributionRow,
  MemberRow,
  PositionName,
} from "@/lib/database.types";
import { IssueControls, ContributionRow } from "../ui";

export const dynamic = "force-dynamic";

const EDITORS: PositionName[] = ["VP-1", "Secretary", "President"];

export default async function PittaIssuePage({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();
  const { position } = await getSessionMember();
  const canEdit = hasPosition(position, EDITORS);

  const { data: issue } = await db
    .from("pitta_issues")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!issue) notFound();
  const iss = issue as PittaIssueRow;

  const [{ data: members }, { data: contribs }] = await Promise.all([
    db.from("members").select("id, name").eq("is_active", true).order("name"),
    db.from("pitta_contributions").select("*").eq("issue_id", params.id),
  ]);
  const titleByMember = new Map(
    ((contribs ?? []) as PittaContributionRow[]).map((c) => [
      c.member_id,
      c.contribution_title,
    ]),
  );

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <Link href="/pitta" style={{ fontSize: 13 }}>
        ← All issues
      </Link>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 22 }}>
          {iss.issue_number ? `Pitta #${iss.issue_number}` : "Pitta issue"}
          {iss.theme ? ` — ${iss.theme}` : ""}
        </h1>
        <p style={{ color: "#667" }}>
          {iss.actual_publish_date
            ? `Published ${iss.actual_publish_date}`
            : iss.target_publish_date
              ? `Target ${iss.target_publish_date}`
              : "No date set"}
        </p>
        <IssueControls issueId={iss.id} status={iss.status} canEdit={canEdit} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <h3 style={{ padding: "14px 14px 6px" }}>Contributions</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => (
              <ContributionRow
                key={m.id}
                issueId={iss.id}
                memberId={m.id}
                name={m.name}
                initialTitle={titleByMember.get(m.id) ?? ""}
                canEdit={canEdit && iss.status !== "Published"}
              />
            ))}
          </tbody>
        </table>
        {iss.status === "Published" && (
          <p style={{ padding: "8px 14px", fontSize: 12, color: "#889" }}>
            Published — contributions are locked and count toward the Pitta
            compliance obligation from {iss.actual_publish_date}.
          </p>
        )}
      </div>
    </div>
  );
}
