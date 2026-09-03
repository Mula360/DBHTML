import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
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
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <h1>Documents</h1>
      <p style={{ color: "#667" }}>
        A register of links — no uploads. Any member can add or edit; only the
        Secretary or President can delete.
      </p>

      <AddDocForm />

      {pinned.length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Pinned</h3>
          <DocList docs={pinned} canDelete={canDelete} />
        </section>
      )}

      {byCategory.map((g) => (
        <section key={g.cat} className="card">
          <h3 style={{ marginBottom: 8 }}>{g.cat}</h3>
          <DocList docs={g.items} canDelete={canDelete} />
        </section>
      ))}

      {docs.length === 0 && (
        <p className="card" style={{ color: "#889" }}>
          No documents yet.
        </p>
      )}
    </div>
  );
}
