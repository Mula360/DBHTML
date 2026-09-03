import Link from "next/link";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { istToday, addDays, daysBetween } from "@/lib/dates";
import {
  computeAllObligations,
  getCurrentConfig,
  type MemberObligations,
} from "@/lib/compliance-compute";
import { getComplianceYear } from "@/lib/compliance";
import {
  PageHead,
  SectionLabel,
  Ring,
  Pill,
  PortfolioTag,
} from "@/components/ui";
import type {
  ActionItemRow,
  MeetingRow,
  NotificationRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const RING_COLOR: Record<string, string> = {
  green: "#00A860",
  amber: "#E67E22",
  red: "#C0392B",
};
const PILL_TONE = { green: "green", amber: "amber", red: "red" } as const;

export default async function DashboardPage() {
  const { member, position } = await getSessionMember();
  const db = createClient();
  const today = istToday();
  const isOfficer = hasPosition(position, OFFICERS);

  const config = await getCurrentConfig(db);
  const year = config ? getComplianceYear(today, config) : null;
  const allObl = config ? await computeAllObligations(db, config, today) : [];
  const mine = allObl.find((r) => r.member.id === member.id);

  const [{ data: items }, { data: nextMtg }, { data: reminders }, escalation] =
    await Promise.all([
      db
        .from("action_items")
        .select("*")
        .eq("assigned_to", member.id)
        .in("status", ["Open", "InProgress"])
        .order("due_date", { ascending: true, nullsFirst: false }),
      db
        .from("meetings")
        .select("*")
        .gte("date", today)
        .order("date")
        .limit(1)
        .maybeSingle(),
      db
        .from("notifications")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(4),
      isOfficer
        ? db
            .from("action_items")
            .select("id", { count: "exact", head: true })
            .in("status", ["Open", "InProgress"])
            .not("due_date", "is", null)
            .lte("due_date", addDays(today, -7))
            .then((r) => r.count ?? 0)
        : Promise.resolve(0),
    ]);

  const myItems = (items ?? []) as ActionItemRow[];
  const done = myItems.length; // placeholder; completion below uses all-time
  void done;
  const meeting = (nextMtg ?? null) as MeetingRow | null;
  const rem = (reminders ?? []) as NotificationRow[];

  const greeting = greetingFor();
  const overdue = myItems.filter((i) => i.due_date && i.due_date < today).length;
  const dueWeek = myItems.filter(
    (i) => i.due_date && i.due_date >= today && i.due_date <= addDays(today, 7),
  ).length;
  const subline =
    myItems.length === 0
      ? "Nothing on your plate right now."
      : `You have ${overdue} overdue item${overdue === 1 ? "" : "s"} and ${dueWeek} due this week.` +
        (meeting ? ` Next EC meeting is ${fmtDate(meeting.date)}.` : "");

  return (
    <div>
      <PageHead
        title={`${greeting}, ${member.name.split(" ")[0]}.`}
        sub={subline}
        actions={
          <>
            <Link href="/pitta" className="btn secondary">
              Submit a Pitta piece
            </Link>
            <Link href="/walks/new" className="btn">
              Coordinate a walk
            </Link>
          </>
        }
      />

      {isOfficer && escalation > 0 && (
        <div className="banner amber row" style={{ justifyContent: "space-between" }}>
          <span style={{ flex: 1, minWidth: 260 }}>
            <b>{escalation} item(s) are 7+ days overdue.</b> Escalated to the
            President and Secretary automatically.
          </span>
          <Link
            href="/action-items?status=Open&overdue=1"
            className="btn orange sm"
          >
            Review
          </Link>
        </div>
      )}

      <SectionLabel
        right={
          <Link href="/compliance">All {allObl.length} members ›</Link>
        }
      >
        My baseline obligations · R&amp;R minimums
      </SectionLabel>

      {mine && year ? (
        <div className="grid-cards">
          {mine.obligations.map((o) => (
            <div key={o.key} className="card row" style={{ gap: 15, alignItems: "center" }}>
              <Ring
                pct={o.minimum ? Math.min(100, (o.achieved / o.minimum) * 100) : 0}
                color={RING_COLOR[o.rag]}
                big={o.achieved}
                unit={`of ${o.minimum}`}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                  {o.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    lineHeight: 1.35,
                    marginBottom: 7,
                  }}
                >
                  {o.note}
                </div>
                <Pill tone={PILL_TONE[o.rag]}>
                  {o.rag === "green"
                    ? "Minimum met"
                    : o.rag === "amber"
                      ? "On pace"
                      : "Behind pace"}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card muted">Compliance config not seeded yet.</div>
      )}

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card flush">
          <div className="card-head">
            <span className="title-sm">My open action items</span>
            <span className="count-tag">
              {myItems.length} open
            </span>
          </div>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Portfolio</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myItems.map((i) => {
                  const isOver = i.due_date && i.due_date < today;
                  const soon =
                    i.due_date && !isOver && i.due_date <= addDays(today, 3);
                  return (
                    <tr key={i.id} style={isOver ? { background: "#fefaf9" } : undefined}>
                      <td>
                        <Link href={`/action-items/${i.id}`}>{i.title}</Link>
                        <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                          {i.source_meeting_id ? "from a meeting" : "created directly"}
                        </div>
                      </td>
                      <td>
                        <PortfolioTag tag={i.portfolio_tag} />
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isOver
                            ? "var(--r-fg)"
                            : soon
                              ? "var(--a-fg)"
                              : "var(--ink-soft)",
                        }}
                      >
                        {i.due_date
                          ? isOver
                            ? `Overdue · ${fmtShort(i.due_date)}`
                            : fmtShort(i.due_date)
                          : "no date"}
                      </td>
                      <td>
                        <Pill tone={isOver ? "red" : soon ? "amber" : ""}>
                          {i.status === "InProgress" ? "In progress" : i.status}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
                {myItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Nothing assigned to you.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card-navy">
            <div className="eyebrow" style={{ marginBottom: 9 }}>
              Next meeting
            </div>
            {meeting ? (
              <>
                <div style={{ font: "400 19px Georgia,serif", marginBottom: 4 }}>
                  {meeting.title}
                </div>
                <div style={{ fontSize: 12.5, color: "#c7dbea", marginBottom: 13 }}>
                  {fmtDate(meeting.date)}
                  {meeting.time ? `, ${meeting.time}` : ""}
                  {meeting.meet_link ? " · Google Meet" : ""}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Link
                    href={`/meetings/${meeting.id}`}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: 10,
                      borderRadius: 7,
                      background: "#fff",
                      color: "var(--navy)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Open
                  </Link>
                  {meeting.meet_link && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: 10,
                        borderRadius: 7,
                        background: "rgba(255,255,255,.14)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Join
                    </a>
                  )}
                </div>
                {mine && (
                  <div
                    style={{
                      marginTop: 13,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(255,255,255,.16)",
                      fontSize: 11.5,
                      color: "#c7dbea",
                    }}
                  >
                    You have attended{" "}
                    <b style={{ color: "#fff" }}>
                      {mine.obligations.find((o) => o.key === "meetings")?.achieved ?? 0}{" "}
                      of {mine.obligations.find((o) => o.key === "meetings")?.minimum ?? 0}
                    </b>{" "}
                    meetings this compliance year.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: "#c7dbea" }}>
                No meeting scheduled.
              </div>
            )}
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Recent notifications
            </div>
            {rem.length === 0 && (
              <div className="muted" style={{ fontSize: 12 }}>
                Nothing yet.
              </div>
            )}
            {rem.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 11,
                  padding: "9px 0",
                  borderBottom: "1px solid #f2f6f8",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: r.read_at ? "var(--line-soft)" : "var(--blue)",
                    marginTop: 5,
                    flex: "none",
                  }}
                />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                    {daysAgo(r.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/notifications"
              style={{ fontSize: 11.5, fontWeight: 600, display: "inline-block", marginTop: 8 }}
            >
              All notifications ›
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function greetingFor() {
  const h = new Date().getUTCHours() + 5.5;
  const hr = ((h % 24) + 24) % 24;
  if (hr < 12) return "Good morning";
  if (hr < 17) return "Good afternoon";
  return "Good evening";
}
function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function fmtShort(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
function daysAgo(ts: string) {
  const d = daysBetween(ts.slice(0, 10), istToday());
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export type { MemberObligations };
