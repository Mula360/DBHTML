"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "./actions";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn secondary sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllRead();
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Mark all read"}
    </button>
  );
}
