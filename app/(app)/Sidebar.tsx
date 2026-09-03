"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import type { PositionName } from "@/lib/database.types";

export function Sidebar({ position }: { position: PositionName | null }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="mark">DB</span>
        Deccan Birders EC
      </div>

      {NAV.map((section) => {
        const items = section.items.filter(
          (it) => !it.positions || (position && it.positions.includes(position)),
        );
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <div className="sect">{section.title}</div>
            {items.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(`${it.href}/`);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={active ? "active" : undefined}
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
