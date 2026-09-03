"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSelfHelper, confirmHelper } from "../actions";

export function HelperControls({
  eventId,
  amHelper,
  canConfirm,
  helpers,
}: {
  eventId: string;
  amHelper: boolean;
  canConfirm: boolean;
  helpers: { id: string; name: string; confirmed: boolean }[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        className={amHelper ? "btn secondary" : "btn"}
        disabled={pending}
        onClick={() => run(() => toggleSelfHelper(eventId))}
      >
        {amHelper ? "Withdraw as helper" : "I'll help with this"}
      </button>
      <div style={{ display: "grid", gap: 4 }}>
        {helpers.map((h) => (
          <div
            key={h.id}
            style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}
          >
            <span>
              {h.name} {h.confirmed && <span className="badge rag-green">confirmed</span>}
            </span>
            {canConfirm && (
              <button
                className="btn secondary"
                style={{ padding: "3px 10px", fontSize: 12 }}
                disabled={pending}
                onClick={() => run(() => confirmHelper(eventId, h.id, !h.confirmed))}
              >
                {h.confirmed ? "Unconfirm" : "Confirm"}
              </button>
            )}
          </div>
        ))}
        {helpers.length === 0 && (
          <p style={{ color: "#889", fontSize: 14 }}>No helpers yet.</p>
        )}
      </div>
    </div>
  );
}
