"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  requestMagicLink,
  passwordSignIn,
  type LoginState,
} from "./actions";
import { TILE_COLORS, type Entry } from "./defaults";
import "./login.css";

const initial: LoginState = { ok: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="login-primary" type="submit" disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}

function Rail({
  colour,
  label,
  entry,
}: {
  colour: string;
  label: string;
  entry?: Entry;
}) {
  if (!entry) return <div />;
  return (
    <div>
      <div className="login-rail-eyebrow">
        <span style={{ background: colour }} />
        <div>{label}</div>
      </div>
      <div className="login-rail-body">{entry.text}</div>
      <div className="login-rail-src">{entry.source}</div>
    </div>
  );
}

export function LoginView({
  hero,
  facts,
  jokes,
  quotes,
  images,
  passwordEnabled,
  error,
}: {
  hero: { title: string; subtitle: string };
  facts: Entry[];
  jokes: Entry[];
  quotes: Entry[];
  images: { url: string; alt: string }[];
  passwordEnabled: boolean;
  error?: string;
}) {
  const [linkState, linkAction] = useFormState(requestMagicLink, initial);
  const [pwState, pwAction] = useFormState(passwordSignIn, initial);
  const [mode, setMode] = useState<"link" | "password">(
    passwordEnabled ? "password" : "link",
  );
  const [i, setI] = useState(0);
  const state = mode === "link" ? linkState : pwState;

  const cycle = Math.max(facts.length, jokes.length, quotes.length, 1);
  const at = (arr: Entry[]) => (arr.length ? arr[i % arr.length] : undefined);
  const tiles = images.length
    ? TILE_COLORS.slice(images.length)
    : TILE_COLORS;

  return (
    <main className="login-shell">
      <div className="login-collage">
        <div className="login-tiles">
          {images.map((img, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`img-${k}`} src={img.url} alt={img.alt} />
          ))}
          {tiles.map((c, k) => (
            <span key={`tile-${k}`} style={{ background: c }} />
          ))}
        </div>
        <div className="login-collage-fade" />
        <div className="login-collage-text">
          <h2>{hero.title}</h2>
          <p>{hero.subtitle}</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Deccan Birders" className="login-logo" />
            <h1>Deccan Birders EC Portal</h1>
            <p className="login-sub">
              {mode === "link"
                ? "Sign in with your committee email. No password — we send a one-time link."
                : "Sign in with your committee email and password."}
            </p>

            {error === "not_member" && (
              <div className="login-alert err" style={{ marginTop: 18 }}>
                This app is for Deccan Birders EC members. Ask the Secretary to
                add your email.
              </div>
            )}

            {mode === "link" ? (
              <form action={linkAction} style={{ marginTop: 26 }}>
                <div className="login-label">Email</div>
                <div className="login-field">
                  <span>✉</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>
                <SubmitButton label="Email me a sign-in link" />
              </form>
            ) : (
              <form action={pwAction} style={{ marginTop: 26 }}>
                <div className="login-label">Email</div>
                <div className="login-field">
                  <span>✉</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="login-label" style={{ marginTop: 16 }}>
                  Password
                </div>
                <div className="login-field">
                  <span>⚿</span>
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <SubmitButton label="Sign in" />
              </form>
            )}

            {state.message && (
              <div className={`login-alert ${state.ok ? "ok" : "err"}`}>
                {state.message}
              </div>
            )}

            {passwordEnabled && (
              <>
                <div className="login-or">
                  <div />
                  <span>OR</span>
                  <div />
                </div>
                <button
                  type="button"
                  className="login-secondary"
                  onClick={() =>
                    setMode(mode === "link" ? "password" : "link")
                  }
                >
                  {mode === "link"
                    ? "Sign in with a password instead"
                    : "Email me a sign-in link instead"}
                </button>
              </>
            )}

            <div className="login-note">
              Not on the committee? The member roll and the newsletter archive
              are on <a href="https://deccanbirders.org">deccanbirders.org</a>.
            </div>
          </div>
        </div>

        <div className="login-rail">
          <div className="login-rail-grid">
            <Rail colour="#00A860" label="FIELD NOTE" entry={at(facts)} />
            <Rail colour="#D9A62C" label="FROM THE HIDE" entry={at(jokes)} />
            <Rail colour="#3078C0" label="ON BIRDING" entry={at(quotes)} />
          </div>
          <div className="login-rail-foot">
            <button
              type="button"
              className="login-shuffle"
              onClick={() => setI((p) => (p + 1) % cycle)}
            >
              ↻ Show me another set
            </button>
            <div className="login-set">
              Set {(i % cycle) + 1} of {cycle} · a new one each time you sign in
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
