"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Receipt, CalendarClock, Settings, LogOut, ListChecks, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { applySavedPrefs } from "@/lib/prefs";
import CalendarPopover from "@/components/Calendarpopover";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("mr-theme") as "dark" | "light") || "light";
  });

  // mobile drawer
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]); // close after navigating
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // unseen task count, shown as a badge on the Tasks nav link
  const [unseenTaskCount, setUnseenTaskCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mr-theme", theme);
    // re-apply the person's saved accent colour, text size and compact layout
    // (accent has a different shade per theme, so this runs on theme change too)
    applySavedPrefs(theme);
  }, [theme]);

  useEffect(() => {
    (window as any).__setMRTheme = (t: "dark" | "light") => setTheme(t);
  }, []);

  // poll unseen task count — on mount, and every 60s while the app is open,
  // so a task assigned while the employee is already logged in still shows up
  // without needing a full page reload.
  useEffect(() => {
    async function loadCount() {
      try {
        const res = await fetch("/api/my-tasks/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        setUnseenTaskCount(data.count || 0);
      } catch { /* silent — badge just stays at its last known value */ }
    }
    loadCount();
    const iv = setInterval(loadCount, 60000);
    return () => clearInterval(iv);
  }, [pathname]); // also refetch on navigation, e.g. right after visiting /dashboard/tasks

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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .layout-root {
          display: flex; min-height: 100vh;
          background: var(--bg); font-family: var(--font-jakarta), system-ui, sans-serif; color: var(--text-primary);
        }

        .sidebar {
          width: 240px; flex-shrink: 0;
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh; overflow: hidden;
        }
        .sidebar::before {
          content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
          width: 160px; height: 160px;
          background: radial-gradient(ellipse, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── brand / logo ── */
        .sidebar-logo {
          position: relative; z-index: 1;
          padding: 1.2rem 1.2rem 1.1rem;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .brand-link { display: block; flex: 1; min-width: 0; }
        .brand-logo { display: block; width: 100%; max-width: 170px; height: auto; }
        .mobile-logo { display: block; height: 34px; width: auto; }

        /* the logo's dark blue is hard to read on the dark theme, so lift it a bit */
        [data-theme="dark"] .brand-logo,
        [data-theme="dark"] .mobile-logo { filter: brightness(1.55) saturate(0.95); }

        .sidebar-nav {
          flex: 1; padding: 1.2rem 0.85rem;
          display: flex; flex-direction: column; gap: 4px;
          position: relative; z-index: 1;
          overflow-y: auto;
        }
        .nav-section-label {
          font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-muted);
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
        .nav-link.active .nav-icon { color: var(--accent); }
        .nav-icon { width: 16px; height: 16px; flex-shrink: 0; transition: color 0.18s; }
        .nav-link.active::before {
          content: ''; position: absolute; left: -0.85rem; top: 50%; transform: translateY(-50%);
          width: 3px; height: 60%; background: var(--accent);
          border-radius: 0 3px 3px 0;
        }
        .nav-badge {
          margin-left: auto; font-size: 0.58rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 7px;
          border-radius: 100px; background: color-mix(in srgb, var(--orange) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--orange) 20%, transparent); color: var(--orange);
        }
        .nav-badge.count {
          background: var(--accent-soft); border-color: var(--accent-border); color: var(--accent);
          min-width: 18px; text-align: center;
        }

        .sidebar-footer {
          position: relative; z-index: 1;
          padding: 1rem 0.85rem 1.5rem;
          border-top: 1px solid var(--border);
        }
        .sidebar-footer-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.75rem; height: 36px;
        }
        .sidebar-footer-label {
          display: inline-flex; align-items: center; height: 36px; line-height: 1;
          font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .logout-btn {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 0.65rem 0.85rem; border-radius: 11px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); font-family: var(--font-jakarta), system-ui, sans-serif; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.18s ease;
        }
        .logout-btn:hover { background: color-mix(in srgb, var(--orange) 8%, transparent); border-color: color-mix(in srgb, var(--orange) 25%, transparent); color: var(--orange); }
        .logout-icon { width: 15px; height: 15px; flex-shrink: 0; }

        .layout-content { flex: 1; min-width: 0; }

        /* mobile top bar + backdrop are hidden on desktop */
        .mobile-bar, .sidebar-backdrop { display: none; }
        .sidebar-close { display: none; }

        /* Settings → Compact layout */
        [data-compact="true"] .ws-inner, [data-compact="true"] .ws-main,
        [data-compact="true"] .ws-left, [data-compact="true"] .ws-right, [data-compact="true"] .sp-inner { gap: 1rem; }
        [data-compact="true"] .ws-card, [data-compact="true"] .ws-timer,
        [data-compact="true"] .sp-card, [data-compact="true"] .lc-card { padding: 1.1rem; }
        [data-compact="true"] .ws-kpi { padding: 0.7rem 0.95rem; }
        [data-compact="true"] .nav-link { padding-top: 0.5rem; padding-bottom: 0.5rem; }

        @media (max-width: 900px) {
          .mobile-bar {
            display: flex; align-items: center; gap: 12px;
            position: sticky; top: 0; z-index: 150; height: 52px; padding: 0 0.9rem;
            background: var(--topbar-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
          }
          .mobile-menu-btn {
            width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer;
          }
          .mobile-menu-btn svg { width: 18px; height: 18px; }

          /* sidebar becomes an off-canvas drawer */
          .sidebar {
            position: fixed; left: 0; top: 0; z-index: 400;
            height: 100vh; height: 100dvh; width: min(280px, 85vw);
            transform: translateX(-100%); transition: transform 0.25s ease;
            box-shadow: none;
          }
          .sidebar.open { transform: translateX(0); box-shadow: 0 0 60px rgba(0,0,0,0.35); }
          .sidebar-backdrop {
            display: block; position: fixed; inset: 0; z-index: 390;
            background: var(--modal-overlay); animation: sbFade 0.2s ease;
          }
          @keyframes sbFade { from { opacity: 0; } to { opacity: 1; } }
          .sidebar-close {
            display: flex; align-items: center; justify-content: center;
            margin-left: auto; width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
            background: transparent; border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;
          }
          .sidebar-close svg { width: 16px; height: 16px; }
          .nav-link { padding: 0.8rem 0.85rem; } /* bigger tap targets */
          .nav-link.active::before { left: -0.85rem; }
        }
      `}</style>

      <div className="layout-root">
        <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <Link href="/dashboard" className="brand-link" aria-label="Malus Robotics home">
              <Image
                src="/malus-logo1.png"
                alt="MalÜs — Dream It, Design It, Deploy It"
                width={747}
                height={334}
                priority
                className="brand-logo"
              />
            </Link>
            <button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
          </div>

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

            {/* Tasks link with live unseen-count badge */}
            <Link href="/dashboard/tasks" className={`nav-link ${isActive("/dashboard/tasks") ? "active" : ""}`}>
              <ListChecks className="nav-icon" />
              Tasks
              {unseenTaskCount > 0 && <span className="nav-badge count">{unseenTaskCount}</span>}
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

          <div className="sidebar-footer">
            {/* calendar + notification bell, sit above Logout */}
            <div className="sidebar-footer-top">
              <span className="sidebar-footer-label">Quick access</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarPopover />
                <NotificationBell />
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <LogOut className="logout-icon" />
              Logout
            </button>
          </div>
        </aside>

        {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

        <main className="layout-content">
          <div className="mobile-bar">
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
            <Image
              src="/malus-logo1.png"
              alt="MalÜs"
              width={747}
              height={334}
              className="mobile-logo"
            />
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
