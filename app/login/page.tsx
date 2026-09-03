"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  requestMagicLink,
  passwordSignIn,
  type LoginState,
} from "./actions";

const initial: LoginState = { ok: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Working…" : label}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [linkState, linkAction] = useFormState(requestMagicLink, initial);
  const [pwState, pwAction] = useFormState(passwordSignIn, initial);
  const [mode, setMode] = useState<"link" | "password">("link");
  const state = mode === "link" ? linkState : pwState;

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
          {mode === "link"
            ? "Sign in with your committee email. No password — we send a one-time link."
            : "Sign in with a password (test accounts only)."}
        </p>

        {searchParams.error === "not_member" && (
          <p className="card rag-red" style={{ marginBottom: 12, fontSize: 13 }}>
            This app is for Deccan Birders EC members. Ask the Secretary to add
            your email.
          </p>
        )}

        {mode === "link" ? (
          <form action={linkAction}>
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
            <SubmitButton label="Email me a sign-in link" />
          </form>
        ) : (
          <form action={pwAction}>
            <label htmlFor="pemail" style={{ fontSize: 13, fontWeight: 600 }}>
              Email
            </label>
            <input
              id="pemail"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@example.com"
              style={{ margin: "6px 0 12px" }}
            />
            <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600 }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{ margin: "6px 0 14px" }}
            />
            <SubmitButton label="Sign in" />
          </form>
        )}

        {state.message && (
          <p
            className={`card ${state.ok ? "rag-green" : "rag-amber"}`}
            style={{ marginTop: 14, fontSize: 13 }}
          >
            {state.message}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "link" ? "password" : "link")}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            color: "var(--brand-primary)",
            fontSize: 12.5,
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {mode === "link"
            ? "Have a test password? Sign in with it"
            : "Back to email sign-in link"}
        </button>
      </div>
    </main>
  );
}
