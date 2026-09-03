"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import type { PositionName } from "@/lib/database.types";

export function Sidebar({ position }: { position: PositionName | null }) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        width: "var(--sidebar-w)",
        flexShrink: 0,
        background: "var(--brand-deep)",
        color: "#cfe0ec",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        padding: "16px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-head)",
          color: "#fff",
          fontSize: 17,
          fontWeight: 700,
          padding: "6px 10px 14px",
        }}
      >
        Deccan Birders EC
      </div>

      {NAV.map((section) => {
        const items = section.items.filter(
          (it) => !it.positions || (position && it.positions.includes(position)),
        );
        if (items.length === 0) return null;
        return (
          <div key={section.title} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: "#7fa4bf",
                padding: "4px 10px",
              }}
            >
              {section.title}
            </div>
            {items.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(`${it.href}/`);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  style={{
                    display: "block",
                    padding: "7px 10px",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : "#cfe0ec",
                    background: active ? "var(--brand-primary)" : "transparent",
                  }}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
