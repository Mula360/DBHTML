export function ModuleStub({
  title,
  phase,
  note,
}: {
  title: string;
  phase: string;
  note?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h1>{title}</h1>
      <div className="card">
        <span className="badge rag-amber">Coming in {phase}</span>
        <p style={{ marginTop: 10, color: "#667" }}>
          {note ??
            "This module is scaffolded. The schema, RLS policies and navigation are in place; the UI lands in a later phase."}
        </p>
      </div>
    </div>
  );
}
