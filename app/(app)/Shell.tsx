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

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

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

          <Link href="/settings" className="whoami" title="Your profile">
            <Avatar name={name} size={32} />
            <span>
              <span className="nm">{name}</span>
              <br />
              <span className="rl">{role}</span>
            </span>
          </Link>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
