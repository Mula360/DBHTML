import type { PositionName } from "@/lib/database.types";

export interface NavItem {
  label: string;
  href: string;
  /** If set, only these positions see the link. */
  positions?: PositionName[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const PORTFOLIOS = [
  "Website",
  "MemberEngagement",
  "FDCoordination",
  "BirdRace",
  "AnnualDinner",
  "AGM",
  "AWC",
  "HBA",
  "IndianRoller",
  "Pitta",
  "NewProject",
] as const;

const REGISTER_MANAGERS: PositionName[] = [
  "VP-1",
  "VP-2",
  "EC2",
  "Treasurer",
  "Secretary",
  "President",
];
const STATUTORY: PositionName[] = ["Secretary", "President", "Treasurer"];

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "My Tasks", href: "/my-tasks" },
    ],
  },
  {
    title: "Club Records",
    items: [
      { label: "Meetings & MoM", href: "/meetings" },
      { label: "Action Items", href: "/action-items" },
      { label: "Walks & Field Trips", href: "/walks" },
      { label: "Annual Events", href: "/events" },
      { label: "Pitta Newsletter", href: "/pitta" },
      { label: "Expense Claims", href: "/finances" },
      {
        label: "Membership Register",
        href: "/membership",
        positions: REGISTER_MANAGERS,
      },
      { label: "Documents", href: "/documents" },
    ],
  },
  {
    title: "Portfolios",
    items: PORTFOLIOS.map((p) => ({
      label: p.replace(/([a-z])([A-Z])/g, "$1 $2"),
      href: `/portfolios/${p}`,
    })),
  },
  {
    title: "Compliance",
    items: [{ label: "Baseline Obligations", href: "/compliance" }],
  },
  {
    title: "Statutory",
    items: [
      { label: "Statutory Tracker", href: "/statutory", positions: STATUTORY },
    ],
  },
  {
    title: "Reports",
    items: [{ label: "Reports", href: "/reports" }],
  },
  {
    title: "Settings",
    items: [{ label: "Settings", href: "/settings" }],
  },
];
