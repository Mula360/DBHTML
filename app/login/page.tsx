"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestMagicLink, type LoginState } from "./actions";

const initial: LoginState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Sending…" : "Email me a sign-in link"}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [state, formAction] = useFormState(requestMagicLink, initial);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--brand-deep)",
        padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth: 380, width: "100%" }}>
        <h1 style={{ fontSize: 22 }}>Deccan Birders EC Portal</h1>
        <p style={{ color: "#667", margin: "8px 0 18px", fontSize: 14 }}>
          Sign in with your committee email. No password — we send a one-time
          link.
        </p>

        {searchParams.error === "not_member" && (
          <p className="card rag-red" style={{ marginBottom: 12, fontSize: 13 }}>
            This app is for Deccan Birders EC members. Ask the Secretary to add
            your email.
          </p>
        )}

        <form action={formAction}>
          <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600 }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            style={{ margin: "6px 0 14px" }}
          />
          <SubmitButton />
        </form>

        {state.message && (
          <p
            className={`card ${state.ok ? "rag-green" : "rag-amber"}`}
            style={{ marginTop: 14, fontSize: 13 }}
          >
            {state.message}
          </p>
        )}
      </div>
    </main>
  );
}
