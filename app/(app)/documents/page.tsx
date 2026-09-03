import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { PageHead, SectionLabel } from "@/components/ui";
import type { DocumentRow } from "@/lib/database.types";
import { AddDocForm, DocList } from "./ui";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = [
  "ByeLaws",
  "MoMArchive",
  "Finance",
  "HBA",
  "AWC",
  "Handover",
  "Other",
];

export default async function DocumentsPage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const canDelete = hasPosition(position, OFFICERS);

  const { data } = await db
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  const docs = (data ?? []) as DocumentRow[];

  // Pinned: ByeLaws + anything titled like the R&R framework
  const pinned = docs.filter(
    (d) =>
      d.category === "ByeLaws" ||
      /r\s*&\s*r|roles?\s*(and|&)?\s*responsibilit/i.test(d.title),
  );
  const rest = docs.filter((d) => !pinned.includes(d));
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: rest.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHead
        title="Documents"
        sub="A register of links — no uploads. Any member can add or edit; only the Secretary or President can delete."
      />

      <div style={{ marginTop: 14 }}>
        <AddDocForm />
      </div>

      {pinned.length > 0 && (
        <>
          <SectionLabel>Pinned</SectionLabel>
          <div className="card">
            <DocList docs={pinned} canDelete={canDelete} />
          </div>
        </>
      )}

      {byCategory.map((g) => (
        <div key={g.cat}>
          <SectionLabel>{g.cat}</SectionLabel>
          <div className="card">
            <DocList docs={g.items} canDelete={canDelete} />
          </div>
        </div>
      ))}

      {docs.length === 0 && (
        <div className="card muted" style={{ marginTop: 16 }}>
          No documents yet.
        </div>
      )}
    </div>
  );
}
