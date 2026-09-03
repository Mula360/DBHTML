import { getSessionMember } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, position } = await getSessionMember();
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar position={position} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            height: "var(--topbar-h)",
            borderBottom: "1px solid var(--line)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--brand-deep)" }}>
            {/* logo placeholder */}
            <span aria-hidden>◧</span> EC Portal
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge">{position ?? "No position"}</span>
            <span style={{ fontSize: 14 }}>{member.name}</span>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--brand-primary)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {initials}
            </span>
            <form action="/logout" method="post">
              <button
                className="btn secondary"
                style={{ padding: "5px 12px", fontSize: 13 }}
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main style={{ padding: "22px", maxWidth: 1100, margin: "0 auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
