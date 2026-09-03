"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { rsvp } from "../actions";

export function RsvpButtons({
  walkId,
  current,
}: {
  walkId: string;
  current: "attending" | "not_attending" | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (s: "attending" | "not_attending") =>
    start(async () => {
      await rsvp(walkId, s);
      router.refresh();
    });

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        className={current === "attending" ? "btn" : "btn secondary"}
        disabled={pending}
        onClick={() => go("attending")}
      >
        Attending
      </button>
      <button
        className={current === "not_attending" ? "btn" : "btn secondary"}
        disabled={pending}
        onClick={() => go("not_attending")}
      >
        Can&apos;t make it
      </button>
    </div>
  );
}
