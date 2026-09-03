"use client";

export function PrintButton() {
  return (
    <button
      className="btn no-print"
      style={{ width: "fit-content" }}
      onClick={() => window.print()}
    >
      Print / save as PDF
    </button>
  );
}
