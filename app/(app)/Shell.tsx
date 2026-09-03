"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNav, type NavItem } from "./nav";
import { Avatar } from "@/components/ui";
import type { PositionName } from "@/lib/database.types";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  position,
  name,
  role,
  unread,
  counts,
  children,
}: {
  position: PositionName | null;
  name: string;
  role: string;
  unread: number;
  counts: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = visibleNav(position);
  const [open, setOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMeOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open && !meOpen) return;
    const close = () => {
      setOpen(false);
      setMeOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open, meOpen]);

  const current =
    nav.find((n) => isActive(pathname, n.href))?.label ?? "Deccan Birders EC";

  const ct = (n: NavItem) => (n.countKey ? counts[n.countKey] : undefined);

  return (
    <div className="app-shell">
      <nav className="rail" aria-label="Primary">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            title={n.label}
            className={isActive(pathname, n.href) ? "active" : undefined}
          >
            {n.icon}
          </Link>
        ))}
      </nav>

      <div className="app-main">
        <header className="topbar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Deccan Birders" className="logo" />
          <span className="vline" />

          <div className="switcher">
            <button
              className={open ? "open" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
            >
              {current}
              <span className="caret">{open ? "▴" : "▾"}</span>
            </button>
            {open && (
              <div className="switcher-menu" onClick={(e) => e.stopPropagation()}>
                {nav.map((n) => {
                  const c = ct(n);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={isActive(pathname, n.href) ? "active" : undefined}
                    >
                      <span className="ico">{n.icon}</span>
                      {n.label}
                      {c ? <span className="ct">{c}</span> : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <span style={{ flex: 1 }} />
          <span className="year">EC year 2026 · Jan–Dec</span>

          <Link href="/notifications" className="bell" title="Notifications">
            ✉{unread > 0 && <span className="dot">{unread > 99 ? "99+" : unread}</span>}
          </Link>

          <div className="whoami" style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMeOpen((v) => !v);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "none",
                border: "none",
                padding: 0,
              }}
              title="Account"
            >
              <Avatar name={name} size={32} />
              <span style={{ textAlign: "left" }}>
                <span className="nm">{name}</span>
                <br />
                <span className="rl">{role}</span>
              </span>
              <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                {meOpen ? "▴" : "▾"}
              </span>
            </button>
            {meOpen && (
              <div
                className="switcher-menu"
                style={{ left: "auto", right: 0, width: 180 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Link href="/settings">
                  <span className="ico">⚙</span>Profile &amp; settings
                </Link>
                <Link href="/notifications">
                  <span className="ico">✉</span>Notifications
                </Link>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: 9,
                      borderRadius: 7,
                      border: "none",
                      background: "none",
                      font: "inherit",
                      fontSize: 12.5,
                      color: "var(--r-fg)",
                      minHeight: 38,
                    }}
                  >
                    <span className="ico" style={{ color: "var(--r-fg)" }}>
                      ⏻
                    </span>
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
