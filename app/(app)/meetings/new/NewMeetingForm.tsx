"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMeeting, type Result } from "../actions";

const initial: Result = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create meeting"}
    </button>
  );
}

export function NewMeetingForm({ today }: { today: string }) {
  const [state, action] = useFormState(createMeeting, initial);
  return (
    <form action={action} className="card" style={{ display: "grid", gap: 12 }}>
      <label style={lbl}>
        Title
        <input name="title" required defaultValue="EC Meeting" />
      </label>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label style={lbl}>
          Date
          <input type="date" name="date" required defaultValue={today} />
        </label>
        <label style={lbl}>
          Time
          <input name="time" placeholder="6:30 pm IST" />
        </label>
      </div>
      <label style={lbl}>
        Google Meet link
        <input name="meet_link" type="url" placeholder="https://meet.google.com/…" />
      </label>
      <label style={lbl}>
        Agenda
        <textarea name="agenda_text" rows={6} placeholder="One item per line…" />
      </label>
      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {state.error}
        </p>
      )}
      <Save />
    </form>
  );
}

const lbl: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 13,
  fontWeight: 600,
};
