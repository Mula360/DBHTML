import { ImportWizard } from "./ImportWizard";

export default function ImportPage() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <h1>Import members from CSV</h1>
      <p style={{ color: "#667" }}>
        Upload your existing register. Map each portal field to a column, review
        the preview, then import. Rows without a name are skipped.
      </p>
      <ImportWizard />
    </div>
  );
}
