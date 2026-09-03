"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEvent } from "../actions";
import type { EventRow } from "@/lib/database.types";

const STATUSES: EventRow["status"][] = ["Planning", "Confirmed", "Done"];

export function EventStatusControl({
  eventId,
  status,
}: {
  eventId: string;
  status: EventRow["status"];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {STATUSES.map((s) => (
        <button
          key={s}
          className={s === status ? "btn" : "btn secondary"}
          style={{ padding: "4px 12px", fontSize: 13 }}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateEvent(eventId, { status: s });
              router.refresh();
            })
          }
        >
          {s}
        </button>
      ))}
    </div>
  );
}
