import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentTerm } from "@/lib/portfolios";
import { PORTFOLIOS } from "@/app/(app)/nav";
import { prettyPortfolio } from "@/lib/constants";
import { istToday } from "@/lib/dates";
import type {
  MemberRow,
  ActionItemRow,
  EventRow,
  PortfolioUpdateRow,
  HbaSeasonRow,
  AwcSiteRow,
} from "@/lib/database.types";
import { UpdateLog, AssignmentEditor, HbaPanel, AwcPanel } from "./ui";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PORTFOLIOS.map((portfolio) => ({ portfolio }));
}

const BIRDRACE_CHECKLIST = [
  "Format & date fixed",
  "Routes drafted",
  "Registrations open",
  "eBird results collated",
  "Prizes / certificates",
  "Pitta report submitted",
];

export default async function PortfolioPage({
  params,
}: {
  params: { portfolio: string };
}) {
  const portfolio = params.portfolio;
  if (!PORTFOLIOS.includes(portfolio as (typeof PORTFOLIOS)[number])) notFound();

  const db = createClient();
  const { position } = await getSessionMember();
  const canEditAssignment = hasPosition(position, OFFICERS);
  const term = await getCurrentTerm(db);

  const [
    { data: assignment },
    { data: members },
    { data: actionItems },
    { data: events },
    { data: updates },
  ] = await Promise.all([
    term
      ? db
          .from("portfolio_assignments")
          .select("*")
          .eq("term_id", term.id)
          .eq("portfolio_name", portfolio)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("members").select("id, name").eq("is_active", true).order("name"),
    db
      .from("action_items")
      .select("*")
      .eq("portfolio_tag", portfolio)
      .in("status", ["Open", "InProgress"]),
    db.from("events").select("*").eq("portfolio_tag", portfolio),
    db
      .from("portfolio_updates")
      .select("*")
      .eq("portfolio_name", portfolio)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const memberList = (members ?? []) as Pick<MemberRow, "id" | "name">[];
  const nameOf = new Map(memberList.map((m) => [m.id, m.name]));
  const a = assignment as
    | { lead_member_id: string | null; support_member_ids: string[] }
    | null;

  const today = istToday();

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 800 }}>
      <h1>{prettyPortfolio(portfolio)}</h1>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Assignment ({term?.label ?? "no term"})</h3>
        <AssignmentEditor
          portfolio={portfolio}
          members={memberList}
          lead={a?.lead_member_id ?? null}
          support={a?.support_member_ids ?? []}
          canEdit={canEditAssignment}
        />
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Status updates</h3>
        <UpdateLog
          portfolio={portfolio}
          updates={((updates ?? []) as PortfolioUpdateRow[]).map((u) => ({
            text: u.update_text,
            by: u.created_by ? (nameOf.get(u.created_by) ?? "—") : "—",
            at: u.created_at,
          }))}
        />
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>
          Open action items ({(actionItems ?? []).length})
        </h3>
        {((actionItems ?? []) as ActionItemRow[]).map((i) => (
          <div key={i.id} style={{ fontSize: 14, padding: "4px 0" }}>
            <Link href={`/action-items/${i.id}`}>{i.title}</Link>
            <span style={{ color: "#889" }}>
              {" "}
              — {nameOf.get(i.assigned_to) ?? "—"}
              {i.due_date
                ? ` · due ${i.due_date}${i.due_date < today ? " (overdue)" : ""}`
                : ""}
            </span>
          </div>
        ))}
        {(actionItems ?? []).length === 0 && (
          <p style={{ color: "#889", fontSize: 14 }}>None.</p>
        )}
      </section>

      {(events ?? []).length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Linked events</h3>
          {((events ?? []) as EventRow[]).map((e) => (
            <div key={e.id} style={{ fontSize: 14, padding: "4px 0" }}>
              <Link href={`/events/${e.id}`}>{e.title}</Link> · {e.date ?? "no date"} ·{" "}
              {e.status}
            </div>
          ))}
        </section>
      )}

      {portfolio === "Pitta" && (
        <section className="card">
          Pitta contributions and issues are managed in the{" "}
          <Link href="/pitta">Pitta module</Link>.
        </section>
      )}

      {portfolio === "BirdRace" && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Bird Race planning checklist</h3>
          <ul style={{ paddingLeft: 18, fontSize: 14, color: "#445" }}>
            {BIRDRACE_CHECKLIST.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p style={{ fontSize: 12, color: "#889", marginTop: 6 }}>
            Track progress with status updates above and action items tagged
            Bird Race.
          </p>
        </section>
      )}

      {portfolio === "HBA" && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>HBA seasons</h3>
          <HbaPanel
            seasons={
              (
                (
                  await db
                    .from("hba_seasons")
                    .select("*")
                    .order("start_date", { ascending: false })
                ).data ?? []
              ) as HbaSeasonRow[]
            }
          />
        </section>
      )}

      {portfolio === "AWC" && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>AWC sites</h3>
          <AwcPanel
            sites={
              (
                (
                  await db
                    .from("awc_sites")
                    .select("*")
                    .order("year", { ascending: false })
                ).data ?? []
              ) as AwcSiteRow[]
            }
          />
        </section>
      )}
    </div>
  );
}
