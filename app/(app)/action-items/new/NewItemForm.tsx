"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createActionItem, type FormResult } from "../actions";
import {
  ACTION_PRIORITIES,
  PORTFOLIO_TAGS,
  prettyPortfolio,
} from "@/lib/constants";
import type { MemberRow } from "@/lib/database.types";

const initial: FormResult = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Create item"}
    </button>
  );
}

export function NewItemForm({
  members,
  meetings,
  today,
}: {
  members: Pick<MemberRow, "id" | "name">[];
  meetings: { id: string; title: string; date: string }[];
  today: string;
}) {
  const [state, action] = useFormState(createActionItem, initial);

  return (
    <form action={action} className="card" style={{ display: "grid", gap: 12 }}>
      <Field label="Title">
        <input name="title" required />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={3} />
      </Field>
      <Field label="Assignee">
        <select name="assigned_to" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Due date">
          <input type="date" name="due_date" min={today} />
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue="Normal">
            {ACTION_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Portfolio">
        <select name="portfolio_tag" defaultValue="General">
          {PORTFOLIO_TAGS.map((p) => (
            <option key={p} value={p}>
              {prettyPortfolio(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Source meeting (optional)">
        <select name="source_meeting_id" defaultValue="">
          <option value="">None</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} · {m.date}
            </option>
          ))}
        </select>
      </Field>

      {state.error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {state.error}
        </p>
      )}
      <Save />
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
