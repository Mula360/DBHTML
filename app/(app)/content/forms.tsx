"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateLoginHero,
  saveContentEntry,
  setEntryActive,
  deleteContentEntry,
  reorderContent,
  uploadCollageImage,
  deleteCollageImage,
  type Result,
} from "./actions";

const initial: Result = {};

function Save({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Msg({ state }: { state: Result }) {
  if (state.error)
    return (
      <p className="card rag-red" style={{ fontSize: 13 }}>
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="card rag-green" style={{ fontSize: 13 }}>
        {state.message}
      </p>
    );
  return null;
}

export function HeroForm({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [state, action] = useFormState(updateLoginHero, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
        Headline
        <input name="title" defaultValue={title} />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
        Sub-line
        <textarea name="subtitle" rows={2} defaultValue={subtitle} />
      </label>
      <Save label="Save hero text" />
      <Msg state={state} />
    </form>
  );
}

export interface EntryRow {
  id: string;
  body: string;
  attribution: string | null;
  is_active: boolean;
}

export function EntryList({
  category,
  label,
  entries,
}: {
  category: string;
  label: string;
  entries: EntryRow[];
}) {
  const [state, action] = useFormState(saveContentEntry, initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (fn: () => Promise<Result>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
      {entries.map((e) => (
        <div
          key={e.id}
          className="card"
          style={{ display: "grid", gap: 6, opacity: e.is_active ? 1 : 0.5 }}
        >
          <div style={{ fontSize: 13 }}>{e.body}</div>
          <div style={{ fontSize: 11, color: "#889" }}>
            {e.attribution || "—"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn secondary"
              style={{ padding: "3px 8px" }}
              disabled={pending}
              onClick={() => act(() => reorderContent(e.id, "up"))}
            >
              ↑
            </button>
            <button
              className="btn secondary"
              style={{ padding: "3px 8px" }}
              disabled={pending}
              onClick={() => act(() => reorderContent(e.id, "down"))}
            >
              ↓
            </button>
            <button
              className="btn secondary"
              style={{ padding: "3px 8px" }}
              disabled={pending}
              onClick={() => act(() => setEntryActive(e.id, !e.is_active))}
            >
              {e.is_active ? "Hide" : "Show"}
            </button>
            <button
              className="btn danger"
              style={{ padding: "3px 8px" }}
              disabled={pending}
              onClick={() => act(() => deleteContentEntry(e.id))}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <form action={action} className="card" style={{ display: "grid", gap: 6 }}>
        <input type="hidden" name="category" value={category} />
        <textarea name="body" rows={2} placeholder="New entry text" required />
        <input name="attribution" placeholder="Attribution / source" />
        <Save label="Add entry" />
        <Msg state={state} />
      </form>
    </div>
  );
}

export function CollageManager({
  images,
}: {
  images: { id: string; url: string; alt: string }[];
}) {
  const [state, action] = useFormState(uploadCollageImage, initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {images.map((img) => (
          <div key={img.id} style={{ display: "grid", gap: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt}
              style={{
                width: "100%",
                height: 90,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
            <button
              className="btn danger"
              style={{ padding: "2px 6px", fontSize: 11 }}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteCollageImage(img.id);
                  router.refresh();
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#889" }}>
        {images.length >= 6
          ? "All 6 collage slots are filled by images."
          : `Brand colour tiles fill the remaining ${6 - images.length} of 6 slots.`}
      </p>
      <form action={action} style={{ display: "grid", gap: 6 }}>
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
        />
        <input name="alt" placeholder="Alt text (bird name)" />
        <Save label="Upload image" />
        <Msg state={state} />
      </form>
    </div>
  );
}
