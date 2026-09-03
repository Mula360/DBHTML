---
title: "Deccan Birders EC Portal — Complete Guide"
subtitle: "Deploy · Administer · Operate"
date: "September 2026"
---

# About this document

This is the single reference for the Deccan Birders Executive Committee portal —
an internal tool for running committee operations: meetings and minutes, action
tracking with automated reminders, a compliance / "baseline obligations"
tracker, field walks, annual events, the AGM statutory calendar, the Pitta
newsletter, portfolio pages, the ~570-member register, expense claims, documents
and reports.

- **Part 1** — deploying the portal (one-time, technical).
- **Part 2** — what the administrator sets up once the portal is live.
- **Part 3** — getting each committee member started.
- **Part 4** — the week-to-week routine.
- **Part 5** — a reference for every screen.
- **Part 6** — accounts and costs.
- **Appendix** — environment variables and troubleshooting.

> **On screenshots.** The portal is not yet deployed, so this guide uses
> labelled screen sketches rather than photographs. Once you have deployed and
> logged in, you can replace each sketch with a real screenshot — the layout and
> field names will match.

\newpage

# Part 1 — Deploying the portal

*One-time setup. About 90 minutes, most of it DNS and Supabase auth
configuration. Skip to Part 2 if someone has already done this.*

## 1.0 What already exists

- **Code:** GitHub repo `Mula360/DBHTML`.
- **Database:** Supabase project `wmpuxjlfqujvfsehqjnt` — created, all four
  migrations applied, seeded with 10 placeholder members.
- **Verified:** builds clean, 22 unit tests, 42 live-database security tests,
  a full run of the daily job — all passing.

## 1.1 Accounts you need

| Service | Role | Tier | Cost |
|---|---|---|---|
| GitHub | holds the code | Free | $0 |
| Supabase | database, magic-link login, security | Free | $0 |
| Vercel | runs the app + the daily job | Hobby or Pro | $0 / $20 mo |
| Resend | sends digests, reminders, login links | Free | $0 |
| Anthropic | *(optional)* drafts minutes from a transcript | pay-as-you-go | ~$1/yr |
| Recall.ai | *(optional)* records + transcribes the Meet call | pay-as-you-go | ~$10/yr |
| A domain | *(optional)* nice URL + email sender | any registrar | ~$12/yr |

## 1.2 Finalise the database

In Supabase → **SQL Editor**, open `supabase/seed.sql` from the repo, edit the
`names` and `emails` arrays at the top with the real 10 committee members — in
this order: **President, VP-1, VP-2, Secretary, Treasurer, EC1, EC2, EC3, EC4,
EC5** — then run it.

> **Only emails listed in the members table can ever log in.** Seed the real
> people before you share the link, or the first login attempt bounces with
> "This app is for Deccan Birders EC members."

## 1.3 Set up email (Resend)

Two separate email paths run on Resend:

- **App email** (digests, reminders) — sent straight from the app.
- **Login links** — sent by Supabase's auth system, which is throttled to about
  four emails an hour unless you give it your own SMTP.

Steps:

1. Create a Resend account. **Add your domain** and paste the DNS records it
   shows (SPF, DKIM, a return-path CNAME) at your domain registrar. Wait for it
   to verify (minutes to an hour).
2. Create an **API key**. Choose a sender address on that domain, e.g.
   `ec@deccanbirders.org`.
3. In Supabase → **Project Settings → Auth → SMTP Settings**, enable custom
   SMTP:

   ```
   Host:     smtp.resend.com
   Port:     465
   Username: resend
   Password: <your Resend API key>
   Sender:   ec@deccanbirders.org
   ```

If you do not have a domain yet, you can pilot with Resend's shared
`onboarding@resend.dev` sender and Supabase's built-in email — just expect login
links to be slow if several people sign in at once. Add the domain before
rolling out to the whole committee.

## 1.4 Deploy to Vercel

1. **vercel.com → Add New → Project → Import** the `Mula360/DBHTML` repo.
2. Under **Environment Variables**, add all of these (Production and Preview):

   ```
   SUPABASE_URL       = https://wmpuxjlfqujvfsehqjnt.supabase.co
   SUPABASE_ANON_KEY  = <anon key — Supabase → Settings → API>
   SUPABASE_SERVICE_ROLE_KEY      = <service_role key — same page>
   APP_URL            = https://<your-project>.vercel.app
   CRON_SECRET                    = <run: openssl rand -hex 24>
   RESEND_API_KEY                 = <from step 1.3>
   RESEND_FROM_EMAIL             = ec@deccanbirders.org
   ```

3. Click **Deploy**. The `vercel.json` in the repo already declares the daily
   job (runs 02:30 UTC = 08:00 IST); Vercel picks it up automatically and, since
   `CRON_SECRET` is set, sends it as the security token the app checks.

*Hobby plan:* the daily job runs once per day (it may be delayed up to an hour) —
which is exactly what this needs. Use Pro ($20/mo) if you want it to fire on the
minute, or if a society tool counts as commercial under Vercel's terms.

## 1.5 Point auth at the live URL

Supabase → **Authentication → URL Configuration**:

- **Site URL** → `https://<your-project>.vercel.app`
- **Redirect URLs** → add `https://<your-project>.vercel.app/auth/callback`

Redeploy the Vercel project after any change to `APP_URL`.

## 1.6 Custom domain *(optional)*

Vercel → **Settings → Domains** → add `ec.deccanbirders.org`, follow the CNAME
instructions, then update `APP_URL` and both Supabase URLs to match
and redeploy.

## 1.7 Smoke test

- Open the URL → you are bounced to the login page.
- Enter a seeded member's email → the magic-link email arrives → click it → you
  land on the dashboard with your position badge.
- Enter an email that is *not* a member → "This app is for Deccan Birders EC
  members."
- From a terminal:

  ```
  curl -H "Authorization: Bearer <CRON_SECRET>" \
    https://<your-project>.vercel.app/api/cron/daily
  ```

  It should return `{"ok":true, … "errors":{}}`.

The optional meeting-bot pipeline (Anthropic + Recall.ai) is covered in Part 6.

\newpage

# Part 2 — Administrator setup

*Do this once, after deployment, before telling the committee to log in. Budget
about two hours, most of it the membership CSV and backfilling this term's
activity. You need to be logged in as the **President** or **Secretary** — the
seed already gives you that position, so officer powers are automatic.*

## 2.0 The setup checklist

1. Log in and confirm you are an officer.
2. Set the baseline rules (Settings).
3. Assign the 11 portfolios.
4. Add the key documents.
5. Load the statutory tracker.
6. Import the membership register.
7. Backfill this term's meetings, walks, events and Pitta.
8. *(If using the bot)* run one test.
9. Roll out to the committee.

## 2.1 Log in and confirm your role

Go to the portal URL, enter your email, click the link in the email. On the
dashboard, the badge next to your name in the top bar should read **President**
or **Secretary**. If it says "No position", the seed did not link your email —
fix the `members` / `member_positions` rows in Supabase and log in again.

```
┌──────────────────────────────────────────────────────────────┐
│  ◧ EC Portal            [ Secretary ]  Sneha Reddy  (SR)  ⏻  │  ← your badge
├────────────┬─────────────────────────────────────────────────┤
│ OVERVIEW   │  Hello, Sneha                                    │
│  Dashboard │  You are Secretary · EC year 2026                │
│  My Tasks  │                                                  │
│ CLUB RECS  │  ┌── My open action items ──────────────────┐    │
│  Meetings  │  │  Nothing assigned to you.                 │    │
│  Action…   │  └──────────────────────────────────────────┘    │
│  …         │                                                  │
│ SETTINGS   │  ┌── My baseline obligations ───────────────┐    │
│  Settings  │  │  Field trips 0/2  Meetings 0/8  …         │    │
└────────────┴─────────────────────────────────────────────────┘
```

## 2.2 Set the baseline rules — **Settings**

Sidebar → **Settings**. Officers see a **Baseline minimums & rules** panel.
Every RAG colour in the portal is driven by these numbers; every change you make
is written to an audit log shown at the bottom of the panel.

```
┌── Baseline minimums & rules ─────────────────────────────────┐
│  Min field trips / year        [ 2 ]                         │
│  Min meetings / year           [ 8 ]                         │
│  Min events / year             [ 2 ]                         │
│  Min Pitta contributions       [ 1 ]                         │
│  Pitta rolling window (days)   [ 180 ]                       │
│  Compliance year start month   [ 9 ]   (September)           │
│  Compliance year end month     [ 8 ]   (August)             │
│  Mid-year alert month          [ 3 ]   (March)              │
│  Year-end report month / day   [ 7 ] / [ 15 ]               │
│  Quorum fraction (Rule 26)     [ 0.3334 ]  (one third)       │
│  ☐ Apology counts as attended                               │
│  ☐ Allow event/trip double-count                            │
│  ☐ Virtual attendance counts for quorum                     │
│                                                             │
│  [ Save minimums ]      Recent changes: (none yet)           │
└─────────────────────────────────────────────────────────────┘
```

Set each from the **Roles & Responsibilities** document and the bye-laws:

| Field | Meaning | Typical value |
|---|---|---|
| Min field trips / year | Walks a member must **coordinate** in the compliance year | 2 |
| Min meetings / year | EC meetings a member must attend | 8 |
| Min events / year | Annual events a member must **assist** (lead-confirmed) | 2 |
| Min Pitta contributions | Contributions required within the rolling window | 1 |
| Pitta rolling window | The window that "1 contribution" is measured over — **not** per year | 180 days |
| Year start / end month | The compliance year. Sept–Aug = `9` / `8` | 9 / 8 |
| Mid-year alert month | Month the mid-year "behind pace" email goes out (on the 1st) | 3 (March) |
| Year-end report month / day | When the full compliance report is emailed to officers | 7 / 15 |
| Quorum fraction | Rule 26 — fraction of the active EC needed for quorum | 0.3334 (⅓) |
| Apology counts as attended | Tick only if your bye-laws say an apology counts toward a member's own meeting tally | usually off |
| Allow event/trip double-count | Tick to let one AWC / Bird Race count as **both** an event assist and a field trip | usually off |
| Virtual attendance counts for quorum | Tick only if a bye-law amendment allows remote members to be counted toward quorum | usually off |

Click **Save minimums**. If you change one of these mid-year, the portal will
recolour dashboards immediately — that is intended (a raised minimum turns people
amber overnight), so if you are tightening a rule, consider setting the change to
take effect from the next compliance year by adjusting the year boundaries
rather than the minimum.

## 2.3 Assign the 11 portfolios

For each portfolio, open its page (sidebar → **Portfolios** → the name) and use
the **Assignment** panel. Only officers see the editor.

```
┌── Website  ·  Assignment (2026-28) ──────────────────────────┐
│  Lead     [ Sneha Reddy  ▾ ]                                 │
│  Support  ┌───────────────────────┐  (Ctrl/Cmd-click for     │
│           │ Arun Prasad           │   multiple)              │
│           │ Deepa Nair            │                          │
│           │ …                     │                          │
│           └───────────────────────┘                          │
│  [ Save assignment ]                                         │
└─────────────────────────────────────────────────────────────┘
```

The 11 portfolios and the seed's starting guess (change to match reality):

| Portfolio | Seed lead | Seed support |
|---|---|---|
| Website | Secretary | EC1 |
| Member Engagement | VP-1 | EC2 |
| FD Coordination | President | EC3 |
| Bird Race | VP-2 | EC4 |
| Annual Dinner | VP-1 | EC5 |
| AGM | Secretary | EC1 |
| AWC | VP-2 | EC2 |
| HBA | Secretary | EC3, EC4 |
| Indian Roller | VP-1 | EC5 |
| Pitta | VP-1 | EC2 |
| New Project | President | EC4 |

## 2.4 Add the key documents — **Documents**

Sidebar → **Documents**. Add a link (title, URL, category) for each of:

- The **bye-laws** (category *ByeLaws* — pinned to the top automatically).
- The **Roles & Responsibilities framework** (also pins automatically if the
  title contains "R&R" or "Roles and Responsibilities").
- The **MoM archive** folder (category *MoMArchive*).
- Any **handover** notes from the previous EC (category *Handover*).
- Finance / audited-accounts links (category *Finance*).

```
┌── Add document ─────────────────────────────────────────────┐
│  [ Deccan Birders Bye-laws ]  [ https://drive.google… ]     │
│  [ ByeLaws ▾ ]   [ Add document ]                           │
└─────────────────────────────────────────────────────────────┘
```

Any member can add or edit a document; only officers can delete.

## 2.5 Load the statutory tracker — **Statutory Tracker**

Sidebar → **Statutory Tracker** (visible to Secretary / President / Treasurer).
Add each external obligation with its due date:

- Post-AGM Registrar filing (authority *Registrar*) — tick **recurring yearly**.
- Annual return / IT department filing (authority *IT Dept*) — recurring.
- Audit sign-off (authority *Auditor*) — recurring.
- Any one-off filings for this term.

```
┌── New statutory item ──────────────────────────────────────┐
│ [ Post-AGM Registrar filing ] [ Registrar ] [ 2026-11-15 ] │
│ [ https://drive… ]  ☑ Recurring yearly   [ Add item ]      │
└────────────────────────────────────────────────────────────┘
```

The Secretary gets an automatic reminder 14 days before each due date; completed
recurring items clone themselves into next year.

## 2.6 Import the membership register — **Membership Register → Import CSV**

Sidebar → **Membership Register** → **Import CSV** (top right).

1. Export your current members spreadsheet to **CSV**.
2. Upload it. The wizard reads the header row and auto-guesses which column maps
   to which field.
3. Correct any wrong guesses in the **Map fields** panel. Only *Name* is
   required; leave a field as "— none —" if your sheet doesn't have it.
4. Check the 5-row **Preview**.
5. Click **Import N rows**. Rows without a name are skipped.

```
┌── Map fields ──────────────────────────────────────────────┐
│  Name *                     [ Full Name          ▾ ]       │
│  Email                      [ Email address       ▾ ]      │
│  Phone                      [ Mobile              ▾ ]      │
│  City                       [ — none —            ▾ ]      │
│  Membership type            [ Type (Annual/Life)  ▾ ]      │
│  Membership number          [ Member ID           ▾ ]     │
│  Joined date (YYYY-MM-DD)   [ Joined              ▾ ]      │
│  Renewal due date           [ Renewal due          ▾ ]    │
└────────────────────────────────────────────────────────────┘
┌── Preview — 573 rows total ───────────────────────────────┐
│ name            email            … renewal_due_date        │
│ A. Krishnan     ak@example.com   … 2026-10-01              │
│ …                                                          │
└────────────────────────────────────────────────────────────┘
        [ Import 573 rows ]
```

Dates should be `YYYY-MM-DD`. If your sheet uses another format, reformat that
column in the spreadsheet before exporting. After import, the nightly job sets
each member's status (Due 30 days before the renewal date, Lapsed 60 days after,
Life always active). You can also open **Membership Register** and check the
status counts at the top.

## 2.7 Backfill this term's history

**This is the step that makes the compliance tracker meaningful.** The tracker
colours a member red when they are *behind pace* — and on day one of using the
portal, with no meetings or walks recorded, everyone is behind pace. Enter what
has already happened this compliance year so the tallies start from the truth.

Priority order (do as much as time allows):

### a. Past EC meetings + attendance — *biggest signal, do this one*

For each EC meeting already held this compliance year:

1. **Meetings & MoM → New meeting** — title, the real date, time.
2. Open it → **Attendance** → mark present / absent / apology for all 10, set
   in-person / virtual → **Save attendance**. Quorum recalculates.
3. Move its status to **Published** (Send agenda → In progress → … → Published)
   so it reads as a closed meeting. You can paste the real minutes into the MoM
   editor, or leave it and just add a Documents link to the existing MoM.

Each "present" tick now counts toward that member's *Meetings attended* tally.

### b. Past walks + coordinators + attendance

For each walk this compliance year:

1. **Walks & Field Trips → New walk** — title, location, real date,
   coordinator(s) (multi-select), eBird list URL.
2. Open it → because the date is in the past you'll see **Mark who attended** →
   tick the members who came → **Save attendance**.

Coordinating counts toward *Field trips coordinated*; co-coordinators each get
full credit.

### c. Past annual events + confirmed helpers

For each event this year:

1. **Annual Events → New event** — title, type, date, lead.
2. Open it → each helper adds themselves (or you add on their behalf is not
   possible — see note) → the **lead or Secretary** confirms each genuine
   assist.

> Members add themselves as helpers; an officer cannot self-add another member.
> For backfill, either ask each member to open the event and click "I'll help
> with this", or accept that historic event credit is entered going forward.

### d. Past Pitta issues + contributions

1. **Pitta Newsletter → New issue** — number, theme, target date.
2. Open it → in the contribution table, type each contributor's piece title.
3. Click **Publish** — this stamps every contribution with the publish date,
   which is what the rolling-window check measures.

### If you deploy well into the term

If backfilling everything isn't practical, the honest alternative is to tell the
committee that compliance tallies build from today and will be accurate by the
year-end report. Do **not** shorten the compliance year to hide the gap — the
year-end report and the R&R minimums are annual figures.

## 2.8 Test the meeting bot *(only if you set up Anthropic + Recall.ai)*

1. **Meetings & MoM → New meeting**, paste a real `meet.google.com` link.
2. Open it → **Meeting bot & AI minutes** → **Activate meeting bot**. The chip
   turns to "Bot scheduled".
3. Start that Meet call yourself. The bot joins within a minute. Say a couple of
   test "decisions" and "action items" out loud, then end the call.
4. Within a few minutes the chip flips to "Transcript received" and the
   **Minutes** section is pre-filled with a draft. Edit, approve, publish as
   normal — nothing was emailed automatically.

```
┌── Meeting bot & AI minutes ────────────────────────────────┐
│  [ Transcript received ]                                   │
│  The bot records the call. Tell participants at the start  │
│  that the meeting is being recorded and transcribed by the │
│  Deccan Birders Assistant. The draft minutes are pre-filled│
│  from the transcript — the Secretary edits and approves;   │
│  nothing is emailed automatically.                         │
└────────────────────────────────────────────────────────────┘
```

## 2.9 Roll out to the committee

Send the committee the email in Part 3.1. You are done — from here the portal
runs its own reminders and digests; your job is per-meeting and a monthly glance.

\newpage

# Part 3 — Getting each member started

## 3.1 The welcome email to send

> **Subject: The new EC portal — 5-minute setup**
>
> Team — our committee operations now run through a portal:
> **`https://ec.deccanbirders.org`** *(use your real URL)*.
>
> **To sign in:** go to the link, enter *this* email address, and click the
> link we send you. No password. The link works for an hour.
>
> **First time, please do three things (5 minutes):**
>
> 1. **Complete your profile** — top-right menu → *Settings* → add your phone
>    number and your eBird username, then *Update profile*.
> 2. **Open *My Tasks*** in the sidebar — this is where your action items live.
>    Anything assigned to you from a meeting shows up here, and you'll get an
>    email reminder 3 days before it's due.
> 3. **Open *Baseline Obligations*** — this is the R&R minimums tracker (2 field
>    trips, 8 meetings, 2 events, 1 Pitta contribution). Your row shows where you
>    stand.
>
> **What's automatic:** a personal digest every Monday, an EC-wide digest on the
> 1st, walk reminders the day before, and nudges when something's overdue. You
> don't have to check the portal daily.
>
> Full guide: *(link to this document)*. Questions to *(admin name)*.

## 3.2 What each member does on first login

```
Top-right menu ▸ Settings ▸ My profile
┌─────────────────────────────────────────────┐
│  Umesh M. · umesh@example.com · VP-1        │
│  Phone           [ +91 98xxxxxx12 ]         │
│  eBird username  [ umesh_m ]                 │
│  Avatar URL      [ (optional) ]             │
│  [ Update profile ]                         │
└─────────────────────────────────────────────┘
```

Members can only edit **their own** row — the administrator cannot fill this in
for them (by design).

## 3.3 The 2-minute orientation for members

| I want to… | Go to |
|---|---|
| See what's on my plate | **My Tasks** (or the Dashboard) |
| Check my R&R standing | **Baseline Obligations** — my row |
| RSVP to a walk | **Walks & Field Trips** → the walk → *Attending* |
| See the next meeting + agenda | **Meetings & MoM** → the upcoming meeting |
| Volunteer for an event | **Annual Events** → the event → *I'll help with this* |
| Add a status update for my portfolio | **Portfolios** → my portfolio → post an update |
| Submit an expense | **Expense Claims** → fill the form |
| Find the bye-laws | **Documents** → pinned at the top |

## 3.4 Role-specific first tasks

- **Secretary:** you drive meetings — create them, send the agenda, mark
  attendance, draft/approve/publish minutes. You also own the Statutory Tracker.
- **Treasurer:** the Dashboard shows a pending-claims count; action claims in
  **Expense Claims**.
- **VP-1 (Pitta Editor):** create and manage issues in **Pitta Newsletter**.
- **President / Secretary:** the only ones who can change the baseline rules and
  portfolio assignments.

\newpage

# Part 4 — Running it week to week

## 4.1 For every EC meeting (the Secretary)

1. **Before:** *Meetings & MoM → New meeting* (title, date, time, agenda, Meet
   link). Move status to **Agenda sent** — this emails the agenda to all members.
2. **During / just after:** open the meeting → **Attendance** grid → mark
   everyone → *Save attendance*. Read the quorum banner.
3. **Minutes:** move status through *In progress → MoM draft*. Fill the
   **Decisions**, **Action Items** (task, assignee, due date), **Announcements**,
   **Next steps**.
4. **Approve:** *Approve minutes & create action items* — this creates every
   staged action item in the Action Items module, linked back to the meeting.
5. **Publish:** *Publish & email all members*. If the meeting had no quorum you
   must type `PUBLISH ANYWAY`, and the minutes carry a Rule 26 notice.

## 4.2 Monthly (any officer, 5 minutes)

- Open **Baseline Obligations** — scan for red rows. The mid-year alert and
  year-end report are automatic, but a monthly glance catches drift early.
- Open **Statutory Tracker** — anything amber (due within 14 days) or red.
- Open **Reports → EC-wide** if you want the attendance heatmap and portfolio
  summary in one view.

## 4.3 What happens without you (the daily job)

| When | What goes out |
|---|---|
| Every day | 3-days-before and just-went-overdue action reminders; 7+-days-overdue escalation to President + Secretary; walk-tomorrow reminders to RSVPs; membership status recompute; statutory 14-day reminders; event T-30/7/1 reminders; AGM notice alerts; Pitta window nudges |
| Mondays | each member's personal digest — open items by urgency + the week's walks/meetings/events |
| 1st of month | EC-wide digest + a renewals-due list to Member Engagement + Treasurer |
| Mid-year month, 1st | "behind pace" alerts to members + a summary to the Secretary |
| Year-end date | the full compliance report to the President + Secretary, filed in Reports → Digest archive |

Every one of those emails also appears as an in-app notification.

## 4.4 Watching the audit log

**Settings → Baseline minimums & rules → Recent changes** lists the last ten
edits to the compliance config, with old and new values and the date. Anyone can
see the current values on the Compliance page; only officers can change them, and
every change lands here.

## 4.5 When a member joins or leaves mid-term

- **Leaves:** in Supabase, set an `end_date` on their row in `member_positions`
  and, if they should keep read access, leave `members.is_active` true; to cut
  access entirely set `is_active = false`.
- **Joins / fills a vacancy:** add a `member_positions` row with the position,
  `start_date`, and a `vacancy_reason`. Add them to `members` first if they are
  new. (A small "manage EC roster" screen is a sensible future addition; for now
  this is a database edit.)

\newpage

# Part 5 — What the portal does (screen reference)

Thirteen screens behind a magic-link login. Every member can read almost
everything; **write** access is by committee position. "Officer" = President or
Secretary.

## Dashboard — `/dashboard`
Position badge; your open action items grouped Overdue / Due this week /
Upcoming; the next meetings and walks; your four baseline-obligation tallies.
Treasurer also sees a pending-claims count.

## Action Items — `/action-items`
Every task the committee owns. Create with title, assignee, due date, priority,
portfolio tag; filter/search; open one to change status (Open → In progress →
Done, or Dropped with a required reason), comment, and read the activity trail.
Overdue is computed live — red past due, amber within three days.
*Write:* anyone creates & comments; the assignee, creator or an officer changes
status; officers delete.
*Automated:* reminder 3 days before due; an alert to the assignee **and** the
portfolio lead the day it goes overdue; a running escalation digest to the
President and Secretary for anything 7+ days overdue.

## Meetings & MoM — `/meetings`
Lifecycle Draft → Agenda sent → In progress → MoM draft → Approved → Published.
Sending the agenda emails all active members. An attendance grid records
present / absent / apology and in-person / virtual per person, and recomputes
quorum on every save. The minutes editor has Decisions, Action Items (staged,
then created for real on approval), Announcements and Next steps. Publishing
emails the minutes to all members.
*Write:* Secretary/President record attendance; the creator or an officer drives
status and minutes.
*Rule 26:* quorum = ⌈active EC × ⅓⌉, from in-person attendance (virtual too only
if the bye-law flag is set). A no-quorum meeting shows a red "decisions not
binding" banner, and publishing its minutes needs a typed `PUBLISH ANYWAY` and
stamps a Rule 26 notice.

## Baseline Obligations — `/compliance`
A 10 × 4 grid — every member against field trips coordinated, meetings attended,
events assisted and Pitta contributions — coloured green / amber / red by
*pace*. Every number is derived from the other modules; nothing is entered here.
*Write:* President/Secretary edit the minimums in Settings (audit-logged).
*Automated:* mid-year pace alert to members who've fallen behind (copied to the
Secretary); Pitta nudge ~30 days before someone's rolling window lapses;
year-end compliance report to the officers.

## Walks & Field Trips — `/walks`
Create a walk with location, date, meeting point, type and one or more
coordinators. The eBird checklist and a Drive photo link are shown as buttons —
no species list or photo upload here. Members RSVP; after the walk a coordinator
ticks who actually came.
*Write:* anyone creates; a coordinator or the Secretary marks attendance.
*Automated:* a reminder the day before to everyone who RSVP'd "attending".
Coordinating feeds the field-trip obligation; co-coordinators each get full
credit.

## Annual Events & the AGM — `/events`
Bird Race, Annual Dinner, AWC, HBA season, outreach and the AGM. Helpers add
themselves; the lead confirms genuine assists (only confirmed assists count for
compliance). Choosing type **AGM** with a date auto-builds the statutory
checklist: the 15-day notice deadline, the nomination window, and warnings until
the venue is named in the notice.
*Write:* members self-add as helpers; the lead or Secretary confirms and edits.
*Automated:* event reminders at T-30, T-7 and T-1; for an AGM, alerts to the
Secretary at T-30 / T-20 / T-17 if the notice still hasn't gone out.

## Statutory Tracker — `/statutory`
Registrar filings, IT returns, audit deadlines — an external authority and a due
date, an optional Drive link, a "recurring yearly" flag.
*Write:* Secretary / President / Treasurer.
*Automated:* a reminder to the Secretary 14 days before each due date; completed
recurring items clone into next year.

## Pitta Newsletter — `/pitta`
One row per issue (number, theme, target date, status Planning → Writing →
Layout → Published). Inside an issue, a table of all 10 members where the editor
types each contribution title. Publishing stamps every contribution with the
publish date, which is what the rolling-window compliance check measures.
*Write:* VP-1 (Editor) / Secretary / President.
The index shows a live list of who has **no** contribution inside the current
window, with days since their last one.

## Portfolio pages — `/portfolios/…`
One page per portfolio (11), driven by the current-term assignment. Each shows
lead + support, a datestamped status-update log any member can post to, the open
action items tagged to that portfolio, and linked events. HBA and AWC get extra
panels; Bird Race gets a planning checklist.
*Write:* anyone posts updates; President/Secretary set the lead and support.

## Membership Register — `/membership`
The ~570 general members — who never log in. Search and filter by status or
type; import from CSV with a column-mapping wizard; export back to CSV for AGM
quorum counts. "Mark renewed" sets the next due date a year out. Deletes are soft
only.
*Write:* VP-1, VP-2, EC2, Treasurer, Secretary, President — others see nothing
here.
*Automated:* nightly status recompute (Due −30d, Lapsed +60d, Life always
active); a renewals-due list in the monthly digest.

## Reports — `/reports`
A per-member annual report (obligations, action-item completion rate, walks
coordinated/attended, Pitta history) laid out for print-to-PDF; an EC-wide
report (obligations grid, portfolio status summary, attendance heatmap with a
quorum row); and an archive of every digest sent.

## Documents — `/documents`
A register of links, not files — bye-laws, R&R framework, MoM archive, finance
and handover docs, grouped by category with bye-laws pinned to the top.
*Write:* anyone adds; Secretary/President delete.

## Expense Claims — `/finances`
A member submits an amount, a description and a Drive receipt link; the Treasurer
moves it Pending → Approved → Settled (or Rejects it), and the claimant is
notified at each step. The Society's audited accounts stay the system of record.
*Write:* any member submits their own; the Treasurer actions them.

## Security model

- Login is members-only — the form checks the email before sending a link, and
  the callback signs out any unknown email that gets one.
- Every table has row-level security in the database, not just the UI. The
  membership register and other members' expense claims return zero rows to
  someone without the right position, even by a hand-crafted request.
- The service key is server-side only — the daily job, the login check and the
  meeting webhook; never sent to a browser.
- The meeting webhook is authenticated by a shared secret.

\newpage

# Part 6 — Accounts and costs

## Cost summary

| Item | When | ~Annual |
|---|---|---|
| Supabase (Free) | always | $0 |
| Vercel Hobby | always | $0 |
| Resend (Free) | always | $0 |
| Domain | optional | ~$12 |
| Anthropic / Claude | meeting bot on | ~$1 (year 1 covered by free credit) |
| Recall.ai | meeting bot on | ~$7–12 |
| Vercel Pro | only if you need exact cron timing / commercial ToS | $240 |

**Minimum viable: $0/year.** With the meeting bot and a domain: **~$20/year**,
most of it Recall.ai recording time.

## The optional meeting-bot pipeline

*Flow:* Secretary adds the Meet link + clicks "Activate bot" → Recall.ai bot
records & transcribes → `/api/recall-webhook` stores the transcript → Claude
drafts decisions / action items / attendance → a **Draft MoM** is pre-filled for
the Secretary to edit and approve. **Nothing is emailed automatically.**

### Anthropic (Claude)

1. `console.anthropic.com` → sign up (phone verification; new accounts get **$5
   free trial credit**).
2. Billing → optionally add a card and top up (minimum **$5**). Leave
   auto-reload **off** so it can never run up a bill.
3. API Keys → Create Key. Add to Vercel:

   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ANTHROPIC_MODEL   = claude-sonnet-4-6   # optional; this is the default
   ```

Claude Sonnet 4.6 is $3 per million input tokens, $15 per million output. A
1½-hour transcript is roughly 20,000 input + 1,500 output tokens ≈ **$0.08 per
meeting** ≈ $0.80/year. The free trial credit alone lasts years.

### Recall.ai

1. `recall.ai` → sign up → **Pay-as-you-go** plan → create an API key (first 5
   recording hours are free).
2. Add a webhook:

   ```
   URL:    https://<your-project>.vercel.app/api/recall-webhook
   Events: transcript.done + bot status events
   ```

3. Pick a shared secret and set it in **both** Recall's webhook config and
   Vercel:

   ```
   RECALL_API_KEY        = <from Recall>
   RECALL_WEBHOOK_SECRET = <a random string, identical on both sides>
   ```

4. Redeploy Vercel.

$0.50/hr recording + $0.15/hr transcription = **$0.65/hr**, billed to the
second, no monthly fee. Ten 1½-hour meetings ≈ 15 hours ≈ **$9.75/year** (first
year less the 5 free hours). Storage is free for 7 days — long enough for the
webhook to pull the transcript.

### Turning it off

Remove the three `ANTHROPIC_*` / `RECALL_*` variables. The pipeline code stays
in the build but goes inert; minutes are then written by hand in the same
editor.

\newpage

# Appendix

## A. All environment variables

| Variable | Required | What it is |
|---|---|---|
| `SUPABASE_URL` | yes | `https://wmpuxjlfqujvfsehqjnt.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Settings → API → service_role secret |
| `APP_URL` | yes | the deployed URL, e.g. `https://ec.deccanbirders.org` |
| `CRON_SECRET` | yes | any random string; the daily job's bearer token |
| `RESEND_API_KEY` | for email | Resend → API Keys |
| `RESEND_FROM_EMAIL` | for email | a verified sender, e.g. `ec@deccanbirders.org` |
| `ANTHROPIC_API_KEY` | bot only | `console.anthropic.com` → API Keys |
| `ANTHROPIC_MODEL` | no | overrides the MoM model; default `claude-sonnet-4-6` |
| `RECALL_API_KEY` | bot only | recall.ai dashboard |
| `RECALL_WEBHOOK_SECRET` | bot only | shared secret, same value in Recall's webhook config |

## B. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "This app is for Deccan Birders EC members" | The email isn't in the `members` table. Add it in Supabase and log in again. |
| No login email arrives | Supabase's built-in sender is throttled (~4/hr). Configure Resend SMTP (Part 1.3). Check Supabase → Authentication → Logs. |
| Badge says "No position" after login | The member has no current-term row in `member_positions` (or `end_date` is set). Add / fix the row. |
| Compliance shows everyone red | Expected on day one. Backfill this term's meetings/walks/events/Pitta (Part 2.7). |
| Digests / reminders not arriving | Check the daily job ran: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<app>/api/cron/daily`. On Vercel, check the cron logs. `RESEND_API_KEY` set? |
| Cron returns 401 | The `CRON_SECRET` in Vercel doesn't match what the scheduler sends. On Vercel it's automatic once the var is set — redeploy. |
| Meeting bot button says "not configured" | `RECALL_API_KEY` isn't set. |
| Draft minutes never appear after a call | Recall webhook not reaching the app, or `RECALL_WEBHOOK_SECRET` mismatch. Check Recall's webhook delivery log and that the URL is `https://<app>/api/recall-webhook`. |
| Membership import fails on a row | Usually a date not in `YYYY-MM-DD`. Reformat that column in the spreadsheet and re-export. |

## C. Where things live

- **Code:** `github.com/Mula360/DBHTML`
- **Database dashboard:** `supabase.com/dashboard/project/wmpuxjlfqujvfsehqjnt`
- **Migrations:** `supabase/migrations/` in the repo (run in order)
- **The daily job:** `GET /api/cron/daily` — logic in `lib/cron/`
- **Tests:** `npm test` (unit) and `node scripts/e2e-test.mjs` (live security tests)
- **This guide's source:** `docs/EC-Portal-Complete-Guide.md`; web version at
  `docs/launch-guide.html`
