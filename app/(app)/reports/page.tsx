import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead, SectionLabel, Avatar } from "@/components/ui";
import type { MemberRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = createClient();
  const { data: members } = await db
    .from("members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <PageHead
        title="Reports"
        sub="Assembled from records the portal already holds — for the AGM and circulated to all ten EC members."
      />

      <SectionLabel>EC-wide</SectionLabel>
      <div className="card" style={{ display: "grid", gap: 8 }}>
        <Link href="/reports/ec">
          Compliance grid, portfolio summary &amp; attendance heatmap
        </Link>
        <Link href="/reports/digests">Digest archive</Link>
      </div>

      <SectionLabel>Per-member annual report</SectionLabel>
      <div className="card flush">
        {((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => (
          <Link
            key={m.id}
            href={`/reports/member/${m.id}`}
            className="row"
            style={{
              gap: 10,
              padding: "11px 16px",
              borderBottom: "1px solid #f2f6f8",
              color: "var(--ink)",
            }}
          >
            <Avatar name={m.name} size={26} />
            {m.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
