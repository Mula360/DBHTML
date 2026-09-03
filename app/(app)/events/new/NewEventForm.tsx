"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createEvent, type Result } from "../actions";
import type { MemberRow } from "@/lib/database.types";

const initial: Result = {};
const TYPES = [
  "AGM",
  "AnnualDinner",
  "BirdRace",
  "AWC",
  "HBASeason",
  "Outreach",
  "Other",
];

function Save() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create event"}
    </button>
  );
}

export function NewEventForm({
  members,
  portfolios,
}: {
  members: Pick<MemberRow, "id" | "name">[];
  portfolios: { value: string; label: string }[];
}) {
  const [state, action] = useFormState(createEvent, initial);
  return (
    <form action={action} className="card" style={{ display: "grid", gap: 12 }}>
      <L label="Title">
        <input name="title" required />
      </L>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <L label="Type">
          <select name="type" defaultValue="Other">
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </L>
        <L label="Date">
          <input type="date" name="date" />
        </L>
      </div>
      <L label="Venue">
        <input name="venue" />
      </L>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <L label="Portfolio">
          <select name="portfolio_tag" defaultValue="">
            <option value="">None</option>
            {portfolios.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </L>
        <L label="Lead">
          <select name="lead_id" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </L>
      </div>
      <p style={{ fontSize: 12, color: "#889" }}>
        Choosing <b>AGM</b> with a date auto-creates the statutory checklist
        (notice deadline = date − 15 days, nomination window).
      </p>
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {state.error}
        </p>
      )}
      <Save />
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
