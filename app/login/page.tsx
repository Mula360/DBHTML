"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  requestMagicLink,
  passwordSignIn,
  type LoginState,
} from "./actions";
import "./login.css";

const initial: LoginState = { ok: false, message: "" };

const FACTS = [
  {
    text: "The Indian Roller is the state bird of Telangana, Andhra Pradesh, Karnataka and Odisha — four states claim the same blue.",
    source: "Coracias benghalensis · resident, common on wires",
  },
  {
    text: "A Coppersmith Barbet's call is measured at roughly 108 notes a minute, and it keeps that rate up for several minutes at a stretch.",
    source: "Psilopogon haemacephalus · resident",
  },
  {
    text: "Painted Storks nest colonially and feed by touch — the half-open bill sweeps through water until it closes on contact.",
    source: "Mycteria leucocephala · resident, breeds Jul–Oct",
  },
  {
    text: "The Indian Pitta arrives with the monsoon and is heard far more often than it is seen. Its two-note whistle carries at dusk.",
    source: "Pitta brachyura · breeding visitor",
  },
  {
    text: "Spot-billed Pelicans breed at only a handful of colonies in south India. Nelapattu and Kolleru hold the largest.",
    source: "Pelecanus philippensis · near-threatened",
  },
  {
    text: "Bar-headed Geese cross the Himalaya on migration, flying at altitudes where oxygen is a third of sea-level.",
    source: "Anser indicus · winter visitor",
  },
];

const JOKES = [
  {
    text: "“Nothing rare here today,” said the member who had left the hide four minutes before the Pitta walked out.",
    source: "Every walk, ever",
  },
  {
    text: "A birder's estimate of distance: fifty metres, give or take fifty metres.",
    source: "Field note, unattributed",
  },
  {
    text: "The bird was almost certainly a warbler. The photograph confirms it was almost certainly a leaf.",
    source: "WhatsApp group, 6:42 am",
  },
  {
    text: "Two birders, three identifications. The third belongs to whoever brought the flask.",
    source: "Osman Sagar, any Sunday",
  },
  {
    text: "The rarest bird in Hyderabad is the one that waits until you have packed the scope.",
    source: "Collected wisdom",
  },
  {
    text: "Attendance at the 5 am meeting point is perfect. Attendance at the 5 pm minutes review is not.",
    source: "The Secretary",
  },
];

const QUOTES = [
  {
    text: "A bird does not sing because it has an answer. It sings because it has a song.",
    source: "Chinese proverb",
  },
  {
    text: "In order to see birds it is necessary to become a part of the silence.",
    source: "Robert Lynd",
  },
  {
    text: "Birds are indicators of the environment. If they are in trouble, we know we'll soon be in trouble.",
    source: "Roger Tory Peterson",
  },
  {
    text: "The bird of paradise alights only upon the hand that does not grasp.",
    source: "John Berry",
  },
  {
    text: "I hope you love birds too. It is economical. It saves going to heaven.",
    source: "Emily Dickinson",
  },
  {
    text: "To watch birds is to notice, and to notice is the beginning of care.",
    source: "Collected, Deccan Birders",
  },
];

const TILE_COLORS = [
  "#3078C0",
  "#00A860",
  "#D9A62C",
  "#2A9D8F",
  "#7B5EA7",
  "#123A5E",
  "#3078C0",
  "#C0392B",
  "#00A860",
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="login-primary" type="submit" disabled={pending}>
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
  const [i, setI] = useState(0);
  const state = mode === "link" ? linkState : pwState;

  const fact = FACTS[i % 6];
  const joke = JOKES[i % 6];
  const quote = QUOTES[i % 6];

  return (
    <main className="login-shell">
      <div className="login-collage">
        <div className="login-tiles">
          {TILE_COLORS.map((c, k) => (
            <span key={k} style={{ background: c }} />
          ))}
        </div>
        <div className="login-collage-fade" />
        <div className="login-collage-text">
          <h2>The Executive Committee portal.</h2>
          <p>
            Minutes, action items, portfolio work and baseline obligations for
            the 2026–2028 committee.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form">
            <img src="/logo.png" alt="Deccan Birders" className="login-logo" />
            <h1>Deccan Birders EC Portal</h1>
            <p className="login-sub">
              {mode === "link"
                ? "Sign in with your committee email. No password — we send a one-time link."
                : "Sign in with a password (test accounts only)."}
            </p>

            {searchParams.error === "not_member" && (
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

            <div className="login-or">
              <div />
              <span>OR</span>
              <div />
            </div>
            <button
              type="button"
              className="login-secondary"
              onClick={() => setMode(mode === "link" ? "password" : "link")}
            >
              {mode === "link"
                ? "Have a test password? Sign in with it"
                : "Back to email sign-in link"}
            </button>

            <div className="login-note">
              Not on the committee? The member roll and the newsletter archive
              are on <a href="https://deccanbirders.org">deccanbirders.org</a>.
            </div>
          </div>
        </div>

        <div className="login-rail">
          <div className="login-rail-grid">
            <div>
              <div className="login-rail-eyebrow">
                <span style={{ background: "#00A860" }} />
                <div>FIELD NOTE</div>
              </div>
              <div className="login-rail-body">{fact.text}</div>
              <div className="login-rail-src">{fact.source}</div>
            </div>
            <div>
              <div className="login-rail-eyebrow">
                <span style={{ background: "#D9A62C" }} />
                <div>FROM THE HIDE</div>
              </div>
              <div className="login-rail-body">{joke.text}</div>
              <div className="login-rail-src">{joke.source}</div>
            </div>
            <div>
              <div className="login-rail-eyebrow">
                <span style={{ background: "#3078C0" }} />
                <div>ON BIRDING</div>
              </div>
              <div className="login-rail-body">{quote.text}</div>
              <div className="login-rail-src">{quote.source}</div>
            </div>
          </div>
          <div className="login-rail-foot">
            <button
              type="button"
              className="login-shuffle"
              onClick={() => setI((p) => (p + 1) % 6)}
            >
              ↻ Show me another set
            </button>
            <div className="login-set">
              Set {(i % 6) + 1} of 6 · a new one each time you sign in
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
