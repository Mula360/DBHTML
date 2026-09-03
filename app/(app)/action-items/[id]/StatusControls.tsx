"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStatus } from "../actions";
import type { ActionStatus } from "@/lib/constants";

export function StatusControls({
  itemId,
  current,
  options,
}: {
  itemId: string;
  current: ActionStatus;
  options: ActionStatus[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();

  if (options.length === 0) {
    return <p style={{ fontSize: 13, color: "#889" }}>No transitions from {current}.</p>;
  }

  const move = (next: ActionStatus) => {
    setError(null);
    start(async () => {
      const res = await changeStatus(
        itemId,
        next,
        next === "Dropped" ? reason : null,
      );
      if (res.error) setError(res.error);
      else {
        setReason("");
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {options.includes("Dropped") && (
        <input
          placeholder="Reason (required to drop)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o}
            className="btn secondary"
            disabled={pending}
            onClick={() => move(o)}
          >
            → {o}
          </button>
        ))}
      </div>
      {error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
