import type { ReactNode } from "react";

/* ---- avatar ---- */
const AV_COLORS = [
  "#123A5E",
  "#3078C0",
  "#2A9D8F",
  "#00A860",
  "#7B5EA7",
  "#D9A62C",
  "#C0392B",
  "#E67E22",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = 28,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: color ?? avatarColor(name),
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ---- progress ring ---- */
export function Ring({
  pct,
  color,
  big,
  unit,
}: {
  pct: number;
  color: string;
  big: ReactNode;
  unit?: ReactNode;
}) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="ring"
      style={{ background: `conic-gradient(${color} ${p}%, #E7EDF1 0)` }}
    >
      <div className="hole">
        <div className="big">{big}</div>
        {unit != null && <div className="unit">{unit}</div>}
      </div>
    </div>
  );
}

/* ---- portfolio colour dot ---- */
const PORTFOLIO_HUE: Record<string, string> = {
  Website: "var(--hue-web)",
  MemberEngagement: "var(--hue-awc)",
  FDCoordination: "var(--hue-race)",
  BirdRace: "var(--hue-race)",
  AnnualDinner: "var(--hue-dinner)",
  AGM: "var(--hue-agm)",
  AWC: "var(--hue-awc)",
  HBA: "var(--hue-hba)",
  IndianRoller: "var(--hue-pitta)",
  Pitta: "var(--hue-pitta)",
  NewProject: "var(--hue-web)",
  General: "var(--ink-faint)",
};

export function portfolioHue(tag: string | null | undefined): string {
  if (!tag) return "var(--ink-faint)";
  return PORTFOLIO_HUE[tag] ?? "var(--ink-faint)";
}

export function PortfolioTag({ tag }: { tag: string | null | undefined }) {
  if (!tag) return <span className="faint">—</span>;
  const label = tag.replace(/([a-z])([A-Z])/g, "$1 $2");
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>
      <span className="pdot" style={{ background: portfolioHue(tag) }} />
      {label}
    </span>
  );
}

/* ---- status pill ---- */
export type Tone = "" | "green" | "amber" | "red" | "navy" | "solid-navy";
export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/* ---- section label with hairline + optional right slot ---- */
export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="section-label">
      <span>{children}</span>
      <span className="rule" />
      {right}
    </div>
  );
}

/* ---- page header ---- */
export function PageHead({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="h1">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

/* ---- RAG helpers ---- */
export function ragTone(rag: "green" | "amber" | "red"): Tone {
  return rag;
}
