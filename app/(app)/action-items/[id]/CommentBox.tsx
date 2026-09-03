"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "../actions";

export function CommentBox({ itemId }: { itemId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await addComment(itemId, text);
      if (res.error) setError(res.error);
      else {
        setText("");
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea
        rows={2}
        placeholder="Add a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button
          className="btn"
          disabled={pending || !text.trim()}
          onClick={submit}
        >
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
      {error && (
        <p className="card rag-red" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
