"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Receipt, CalendarClock, Settings, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // ── Read theme ONCE from localStorage as the initial value ──
  // This runs synchronously before first render so the default is always
  // correct and we never flash dark→light. The root layout script already
  // sets data-theme on <html> before paint; here we just keep React in sync.
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mr-theme") as "dark" | "light") || "dark";
  });

  // ── Apply to DOM and persist whenever theme changes ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mr-theme", theme);
  }, [theme]);

  // Expose setter globally so Settings page can call it without prop drilling
  useEffect(() => {
    (window as any).__setMRTheme = (t: "dark" | "light") => setTheme(t);
  }, []);

  function isActive(path: string) {
    return pathname === path;
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root, [data-theme="dark"] {
          --bg: #0a0a0f; --surface: #111118; --surface-2: #16161f; --surface-3: #1c1c28;
          --border: rgba(255,255,255,0.06); --border-hover: rgba(255,255,255,0.12);
          --accent: #7c6af7; --accent-soft: rgba(124,106,247,0.12); --accent-border: rgba(124,106,247,0.2);
          --accent-glow: rgba(124,106,247,0.25); --orange: #f97316;
          --text-primary: #f0f0f8; --text-secondary: #8888aa; --text-muted: #44445a;
        }
        [data-theme="light"] {
          --bg: #f4f5f9; --surface: #ffffff; --surface-2: #f0f1f6; --surface-3: #e8eaf0;
          --border: rgba(0,0,0,0.08); --border-hover: rgba(0,0,0,0.15);
          --accent: #6355e8; --accent-soft: rgba(99,85,232,0.08); --accent-border: rgba(99,85,232,0.2);
          --accent-glow: rgba(99,85,232,0.15); --orange: #ea6c0a;
          --text-primary: #0f0f1a; --text-secondary: #555570; --text-muted: #9999b5;
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        .layout-root {
          display: flex; min-height: 100vh;
          background: var(--bg); font-family: 'Syne', sans-serif; color: var(--text-primary);
        }

        /* SIDEBAR */
        .sidebar {
          width: 240px; flex-shrink: 0;
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh; overflow: hidden;
        }
        .sidebar::before {
          content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
          width: 160px; height: 160px;
          background: radial-gradient(ellipse, rgba(124,106,247,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .sidebar-logo {
          position: relative; z-index: 1;
          padding: 1.5rem 1.4rem 1.4rem;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .sidebar-logo-mark {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--accent); box-shadow: 0 0 16px var(--accent-glow);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sidebar-logo-mark svg { width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 2.5; stroke-linecap: round; }
        .sidebar-brand { font-size: 0.95rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); line-height: 1.15; }
        .sidebar-brand-sub { font-size: 0.6rem; font-weight: 500; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }

        .sidebar-nav {
          flex: 1; padding: 1.2rem 0.85rem;
          display: flex; flex-direction: column; gap: 4px;
          position: relative; z-index: 1;
        }
        .nav-section-label {
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--text-muted); font-family: 'JetBrains Mono', monospace;
          padding: 0 0.6rem; margin-bottom: 6px; margin-top: 4px;
        }
        .nav-divider { height: 1px; background: var(--border); margin: 0.75rem 0.6rem; }

        .nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 0.65rem 0.85rem; border-radius: 11px;
          font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);
          text-decoration: none; transition: all 0.18s ease;
          border: 1px solid transparent; position: relative;
        }
        .nav-link:hover { background: var(--surface-2); color: var(--text-primary); border-color: var(--border); }
        .nav-link.active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-border); }
        .nav-link.active .nav-icon { color: var(--accent); filter: drop-shadow(0 0 6px var(--accent-glow)); }
        .nav-icon { width: 16px; height: 16px; flex-shrink: 0; transition: color 0.18s; }
        .nav-link.active::before {
          content: ''; position: absolute; left: -0.85rem; top: 50%; transform: translateY(-50%);
          width: 3px; height: 60%; background: var(--accent);
          border-radius: 0 3px 3px 0; box-shadow: 0 0 8px var(--accent-glow);
        }
        .nav-badge {
          margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.55rem; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 7px;
          border-radius: 100px; background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.2); color: var(--orange);
        }

        /* SIDEBAR FOOTER */
        .sidebar-footer {
          position: relative; z-index: 1;
          padding: 1rem 0.85rem 1.5rem;
          border-top: 1px solid var(--border);
        }
        .logout-btn {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 0.65rem 0.85rem; border-radius: 11px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.18s ease;
        }
        .logout-btn:hover { background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); color: var(--orange); }
        .logout-icon { width: 15px; height: 15px; flex-shrink: 0; transition: filter 0.18s; }
        .logout-btn:hover .logout-icon { filter: drop-shadow(0 0 5px rgba(249,115,22,0.5)); }

        .layout-content { flex: 1; min-width: 0; }
      `}</style>

      <div className="layout-root">
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <svg viewBox="0 0 14 14">
                <rect x="3" y="5" width="8" height="6" rx="1.5" />
                <line x1="7" y1="2" x2="7" y2="5" />
                <circle cx="7" cy="1.5" r="0.8" fill="white" stroke="none" />
                <line x1="2" y1="7.5" x2="3" y2="7.5" />
                <line x1="11" y1="7.5" x2="12" y2="7.5" />
              </svg>
            </div>
            <div>
              <div className="sidebar-brand">Malus Robotics</div>
              <div className="sidebar-brand-sub">Workspace</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            <div className="nav-section-label">Main</div>

            <Link href="/dashboard" className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}>
              <LayoutDashboard className="nav-icon" />
              Attendance
            </Link>

            <Link href="/dashboard/history" className={`nav-link ${isActive("/dashboard/history") ? "active" : ""}`}>
              <CalendarDays className="nav-icon" />
              History
            </Link>

            <div className="nav-divider" />
            <div className="nav-section-label">Finance</div>

            <Link href="/dashboard/expense" className={`nav-link ${isActive("/dashboard/expense") ? "active" : ""}`}>
              <Receipt className="nav-icon" />
              Expenses
              <span className="nav-badge">New</span>
            </Link>

            <Link href="/dashboard/leaves" className={`nav-link ${isActive("/dashboard/leaves") ? "active" : ""}`}>
              <CalendarClock className="nav-icon" />
              Leaves
            </Link>

            <div className="nav-divider" />
            <div className="nav-section-label">Account</div>

            <Link href="/dashboard/settings" className={`nav-link ${isActive("/dashboard/settings") ? "active" : ""}`}>
              <Settings className="nav-icon" />
              Settings
            </Link>
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}>
              <LogOut className="logout-icon" />
              Logout
            </button>
          </div>
        </aside>

        <main className="layout-content">{children}</main>
      </div>
    </>
  );
}