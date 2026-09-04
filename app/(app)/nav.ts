import type { PositionName } from "@/lib/database.types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** count key resolved server-side, e.g. "actions" | "meetings" | "pitta" */
  countKey?: "actions" | "meetings" | "pitta" | "walks" | "claims";
  positions?: PositionName[];
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
const ADMINS: PositionName[] = ["President", "Secretary"];

/** One list, used for both the icon rail and the switcher dropdown. */
export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Tasks", href: "/my-tasks", icon: "☰" },
  { label: "Meetings & MoM", href: "/meetings", icon: "▤", countKey: "meetings" },
  { label: "Action Items", href: "/action-items", icon: "✓", countKey: "actions" },
  { label: "Walks & Field Trips", href: "/walks", icon: "➤", countKey: "walks" },
  { label: "Annual Events", href: "/events", icon: "★" },
  { label: "Pitta Newsletter", href: "/pitta", icon: "✎", countKey: "pitta" },
  { label: "Baseline Obligations", href: "/compliance", icon: "◎" },
  { label: "Portfolios", href: "/portfolios", icon: "❖" },
  { label: "Statutory Tracker", href: "/statutory", icon: "§", positions: STATUTORY },
  { label: "Expense Claims", href: "/finances", icon: "₹", countKey: "claims" },
  {
    label: "Membership Register",
    href: "/membership",
    icon: "⊞",
    positions: REGISTER_MANAGERS,
  },
  { label: "Documents", href: "/documents", icon: "▢" },
  { label: "Reports", href: "/reports", icon: "◧" },
  { label: "Login & Content", href: "/content", icon: "❐", positions: ADMINS },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

export function visibleNav(position: PositionName | null): NavItem[] {
  return NAV.filter(
    (it) => !it.positions || (position && it.positions.includes(position)),
  );
}
