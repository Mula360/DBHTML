"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createWalk, type Result } from "../actions";
import type { MemberRow } from "@/lib/database.types";

const initial: Result = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create walk"}
    </button>
  );
}

export function NewWalkForm({
  members,
  today,
}: {
  members: Pick<MemberRow, "id" | "name">[];
  today: string;
}) {
  const [state, action] = useFormState(createWalk, initial);
  return (
    <form action={action} className="card" style={{ display: "grid", gap: 12 }}>
      <L label="Title">
        <input name="title" required placeholder="Osman Sagar walk" />
      </L>
      <L label="Location">
        <input name="location" required />
      </L>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <L label="Date">
          <input type="date" name="date" required defaultValue={today} />
        </L>
        <L label="Type">
          <select name="type" defaultValue="Local">
            <option>Local</option>
            <option>Outstation</option>
          </select>
        </L>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <L label="Meet time">
          <input name="meet_time" placeholder="06:30" />
        </L>
        <L label="Meet point">
          <input name="meet_point" placeholder="Second gate" />
        </L>
      </div>
      <L label="Coordinators (Ctrl/Cmd-click for multiple)">
        <select name="coordinators" multiple size={Math.min(6, members.length)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </L>
      <L label="eBird list URL (source of truth for species)">
        <input name="ebird_list_url" type="url" placeholder="https://ebird.org/…" />
      </L>
      <L label="Photos — Google Drive URL">
        <input name="photos_drive_url" type="url" placeholder="https://drive.google.com/…" />
      </L>
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
