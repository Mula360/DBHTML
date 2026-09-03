"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markRenewed, softDelete } from "./actions";

export function MemberRowControls({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        className="btn secondary"
        style={{ padding: "2px 8px", fontSize: 12 }}
        disabled={pending}
        onClick={() => run(() => markRenewed(id))}
      >
        Renewed
      </button>
      {confirm ? (
        <button
          className="btn"
          style={{ padding: "2px 8px", fontSize: 12, background: "var(--rag-red-fg)", borderColor: "var(--rag-red-fg)" }}
          disabled={pending}
          onClick={() => run(() => softDelete(id))}
        >
          Confirm
        </button>
      ) : (
        <button
          className="btn secondary"
          style={{ padding: "2px 8px", fontSize: 12 }}
          onClick={() => setConfirm(true)}
        >
          Delete
        </button>
      )}
    </div>
  );
}
