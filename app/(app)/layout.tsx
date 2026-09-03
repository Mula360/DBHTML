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
    <div className="app-shell">
      <Sidebar position={position} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header className="topbar">
          <span className="wordmark">Deccan Birders</span>
          <span className="divider" />
          <span className="position-chip">{position ?? "No position"}</span>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="who">
              <div className="name">{member.name}</div>
              {position && <div className="role">{position}</div>}
            </div>
            <span className="avatar">{initials}</span>
            <form action="/logout" method="post">
              <button
                className="btn secondary"
                style={{ padding: "6px 12px", minHeight: 0, fontSize: 12 }}
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
