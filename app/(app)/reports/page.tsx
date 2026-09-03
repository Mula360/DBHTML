import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      <h1>Reports</h1>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>EC-wide</h3>
        <ul style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>
            <Link href="/reports/ec">
              Compliance grid, portfolio summary &amp; attendance heatmap
            </Link>
          </li>
          <li>
            <Link href="/reports/digests">Digest archive</Link>
          </li>
        </ul>
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Per-member annual report</h3>
        <div style={{ display: "grid", gap: 4 }}>
          {((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => (
            <Link key={m.id} href={`/reports/member/${m.id}`}>
              {m.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
