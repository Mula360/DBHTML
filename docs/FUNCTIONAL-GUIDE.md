# EC Portal — functional guide

Thirteen screens behind a magic-link login, one shared sidebar, one daily
background job. Every member can read almost everything; **write access** is
granted per module by committee position.

Positions (current term): President, VP-1, VP-2, Secretary, Treasurer, EC1–EC5.
"Officer" = President or Secretary. VP-1 is also the Pitta Editor.

---

## Dashboard — `/dashboard`
Position badge; your open action items grouped Overdue / Due this week /
Upcoming; next meetings and walks; your four baseline-obligation tallies as
coloured chips. Treasurer also sees a pending-claims count.

## Action Items — `/action-items`
Every task the committee owns. Create (title, assignee, due date, priority,
portfolio tag); filter/search; open one to change status
(Open → InProgress → Done, or Dropped with a required reason), comment, read the
activity trail. Overdue computed live (red past due, amber within 3 days).
- **anyone** creates & comments · **assignee / creator / officer** edits status ·
  **officer** deletes
- *Automated:* reminder 3 days before due; on the day it goes overdue an alert
  to the assignee **and** the portfolio lead; running escalation digest to the
  President + Secretary for anything 7+ days overdue.

## Meetings & MoM — `/meetings`
Lifecycle Draft → AgendaSent → InProgress → MoMDraft → Approved → Published.
Sending the agenda emails all active members. Attendance grid: present / absent /
apology + in-person / virtual per person, recomputes quorum on save. Structured
minutes editor (Decisions, Action Items, Announcements, Next steps); action
items are staged then created for real on approval. Publishing emails the
minutes to all members.
- **Secretary / President** record attendance · **creator / officer** drive
  status & minutes
- *Rule 26:* quorum = ⌈active EC × ⅓⌉, from in-person attendance (virtual too
  only if the bye-law flag is set). No-quorum meeting → red "decisions not
  binding" banner; publishing its minutes needs a typed `PUBLISH ANYWAY` and
  stamps a Rule 26 notice.

## Baseline Obligations — `/compliance`
10 × 4 grid (field trips coordinated, meetings attended, events assisted, Pitta
contributions) coloured green/amber/red by *pace* — amber = keeping up with the
calendar, red = behind it. Every number is derived from other modules.
- **everyone** reads · **President / Secretary** edit the minimums in Settings
  (every change logged to an audit table)
- *Automated:* mid-year pace alert to members who've fallen behind (copied to
  the Secretary); Pitta nudge ~30 days before someone's rolling window lapses;
  full year-end compliance report to the officers on the configured date.

## Walks & Field Trips — `/walks`
Create with location, date, meeting point, type, one or more coordinators. eBird
checklist + Drive photo link shown as buttons — no species list or photo upload
(eBird and Drive are the record). Members RSVP; a coordinator ticks actual
attendance afterwards.
- **anyone** creates · **coordinator / Secretary** marks attendance
- *Automated:* day-before reminder to everyone who RSVP'd "attending".
  Coordinating feeds the field-trip obligation; co-coordinators each get full
  credit.

## Annual Events & the AGM — `/events`
Bird Race, Annual Dinner, AWC, HBA season, outreach, AGM. Helpers self-add; the
lead confirms genuine assists (only confirmed count for compliance). Type
**AGM** + a date auto-builds the statutory checklist: 15-day notice deadline,
nomination window, venue-named warning.
- **members** self-add as helpers · **lead / Secretary** confirm & edit
- *Automated:* reminders at T-30 / T-7 / T-1; for an AGM, Secretary alerts at
  T-30 / T-20 / T-17 if the notice hasn't gone out.

## Statutory Tracker — `/statutory`
Registrar filings, IT returns, audit deadlines — external authority + due date,
optional Drive link, "recurring yearly" flag.
- **Secretary / President / Treasurer** only
- *Automated:* reminder to the Secretary 14 days before each due date; completed
  recurring items clone into next year.

## Pitta Newsletter — `/pitta`
One row per issue (number, theme, target date, status
Planning → Writing → Layout → Published). Inside an issue, a 10-member table where
the editor types each contribution title. Publishing stamps every contribution
with the publish date — what the rolling-window compliance check measures.
- **VP-1 (Editor) / Secretary / President** only
- Index shows who has **no** contribution in the current window, with days since
  their last.

## Portfolio pages — `/portfolios/…`
One page per portfolio (11), driven by the current-term assignment: lead +
support, a datestamped status-update log (any member posts), open action items
tagged to that portfolio, linked events. HBA/AWC get extra panels (season
checklist, per-site count + Wetlands International flag); Bird Race gets a
planning checklist.
- **anyone** posts updates · **President / Secretary** set lead & support

## Membership Register — `/membership`
The ~570 general members (who never log in). Search/filter by status or type;
CSV import with a column-mapping wizard + preview; CSV export for AGM counts.
"Mark renewed" sets the next due date a year out. Soft delete only.
- **VP-1, VP-2, EC2, Treasurer, Secretary, President** — others see nothing here
- *Automated:* nightly status recompute (Due 30 days before renewal, Lapsed 60
  days after, Life always active); renewals-due list in the monthly digest for
  Member Engagement + Treasurer.

## Reports — `/reports`
Per-member annual report (obligations, action-item completion rate, walks
coordinated/attended, Pitta history) laid out for print-to-PDF; EC-wide report
(obligations grid, portfolio status summary, attendance heatmap with a quorum
row); archive of every digest sent.

## Documents — `/documents`
A register of links, not files — bye-laws, R&R framework, MoM archive, finance,
handover — grouped by category, bye-laws pinned to top.
- **anyone** adds · **Secretary / President** delete

## Expense Claims — `/finances`
Member submits amount + description + Drive receipt link; Treasurer moves it
Pending → Approved → Settled (or Rejects); claimant notified at each step. The
Society's audited accounts stay the system of record — no ledger here.
- **any member** submits their own · **Treasurer** actions them

---

## The daily job

One scheduled request at 08:00 IST. Reads every threshold from the Settings
config; each task isolated; every email mirrored to an in-app notification.

| Cadence | Tasks |
|---|---|
| Every day | due-in-3-days + newly-overdue action-item alerts; 7+-day escalation digest; walk-tomorrow reminders; membership status recompute; statutory 14-day reminders; event T-30/7/1 reminders; AGM notice alerts; recurring-statutory clone; Pitta window nudges |
| Mondays | per-member weekly digest (open items by urgency + the week's calendar) |
| 1st of month | EC-wide digest + renewals-due list to Member Engagement + Treasurer |
| Mid-year date | pace alerts to members behind on obligations, copied to Secretary |
| Year-end date | full compliance report to President + Secretary, filed in the digest archive |

---

## Security model

- **Login is members-only** — the form checks the email against `members` before
  sending a link; the callback signs out any unknown email that gets one.
- **Row-level security on every table**, in the database — not just the UI. A
  helper resolves your current-term position per request; policies decide reads
  and writes. The membership register and other members' expense claims return
  *zero rows* to someone without the right position, even by hand-crafted
  request. Covered by `scripts/e2e-test.mjs` (42 assertions across 5 roles).
- **The service key stays server-side** — cron job, login check, meeting webhook
  only; never sent to a browser.
- **The meeting webhook** is authenticated by a shared secret; unauthenticated
  requests are rejected before anything is read.
