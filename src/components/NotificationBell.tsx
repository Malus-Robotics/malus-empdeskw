// src/components/NotificationBell.tsx
// REPLACES the previous version — same behavior, but the dropdown panel is
// now rendered through a React portal straight into document.body instead
// of as a normal absolutely-positioned child of the trigger button.
//
// WHY: your sidebar (<aside className="sidebar">) has `overflow: hidden`
// (needed for its glow pseudo-element at the top), so a panel positioned
// absolute inside it gets clipped to the sidebar's own bounds — which is
// exactly the cut-off sliver you saw. Portal-ing it to <body> and
// positioning it with `position: fixed` + coordinates read from the
// trigger button's real screen position (getBoundingClientRect) makes it
// float freely over the whole page, immune to any ancestor's overflow or
// z-index stacking context.

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  TASK_UPDATED: "📋",
  LEAVE_APPROVED: "✅",
  LEAVE_REJECTED: "❌",
  LEAVE_SUBMITTED: "📝",
  EXPENSE_APPROVED: "💰",
  EXPENSE_REJECTED: "💸",
  BIRTHDAY: "🎉",
  ANNOUNCEMENT: "📢",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const PANEL_WIDTH = 360;
const PANEL_GAP = 10;

export default function NotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* silent — bell just keeps its last known state */
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [pathname]);

  // Compute the panel's fixed-position coordinates from the trigger button's
  // real on-screen position, anchoring the panel's right edge to the
  // trigger's right edge and clamping so it never runs off the left/right
  // of the viewport. The bell lives at the bottom of the sidebar, so there
  // usually isn't room to drop the panel below it — if the panel (using its
  // real rendered height once open, or a sane estimate before that) won't
  // fit below the trigger, it opens upward from the trigger instead.
  function positionPanel() {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    let left = rect.right - PANEL_WIDTH;
    left = Math.max(16, Math.min(left, window.innerWidth - PANEL_WIDTH - 16));

    const estimatedHeight = panelRef.current?.offsetHeight || 420; // header + a few rows
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
    const spaceAbove = rect.top - PANEL_GAP;

    let top: number;
    if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
      // enough room below (or more room below than above) — open downward
      top = rect.bottom + PANEL_GAP;
    } else {
      // not enough room below — open upward, anchored to the trigger's top
      top = Math.max(16, rect.top - PANEL_GAP - estimatedHeight);
    }

    setPanelPos({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    // First pass: position using an estimated height (panel isn't rendered
    // yet, so panelRef.current is still null). Second pass, right after,
    // repositions using the panel's real rendered height now that it
    // exists — this is what makes the "open upward" math accurate instead
    // of relying on the 420px guess.
    positionPanel();
    const raf = requestAnimationFrame(positionPanel);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markOne(id: string) {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  const panel = open && panelPos && (
    <div
      ref={panelRef}
      className="nb-panel"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      <div className="nb-header">
        <span className="nb-title">Notifications</span>
        {unreadCount > 0 && (
          <button className="nb-mark-all" onClick={markAll}>Mark all read</button>
        )}
      </div>
      <div className="nb-list">
        {items.length === 0 ? (
          <div className="nb-empty">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <a
              key={n._id}
              href={n.link || "#"}
              className={`nb-item ${!n.read ? "unread" : ""}`}
              onClick={() => !n.read && markOne(n._id)}
            >
              <span className="nb-icon">{TYPE_ICON[n.type] || "🔔"}</span>
              <span className="nb-body">
                <span className="nb-item-title">{n.title}</span>
                <span className="nb-item-text">{n.body}</span>
                <span className="nb-item-time">{timeAgo(n.createdAt)}</span>
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .nb-trigger {
          position: relative; width: 36px; height: 36px; border-radius: 10px; padding: 0;
          display: flex; align-items: center; justify-content: center; line-height: 0;
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; transition: all 0.18s;
          flex-shrink: 0;
        }
        .nb-trigger:hover { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-hover); }
        .nb-trigger svg { width: 17px; height: 17px; display: block; }
        .nb-dot {
          position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px;
          border-radius: 100px; background: var(--red); color: #fff;
          font-family: var(--font-jbmono), monospace; font-size: 0.58rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; padding: 0 3px;
          border: 2px solid var(--bg);
        }
        .nb-panel {
          position: fixed; width: ${PANEL_WIDTH}px;
          max-width: calc(100vw - 2rem);
          background: var(--surface); border: 1px solid var(--border-hover);
          border-radius: 16px; box-shadow: 0 20px 56px rgba(0,0,0,0.3);
          z-index: 2000; overflow: hidden; animation: nbIn 0.15s ease;
        }
        @keyframes nbIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .nb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--border);
        }
        .nb-title { font-size: 0.82rem; font-weight: 800; color: var(--text-primary); }
        .nb-mark-all {
          font-family: var(--font-jbmono), monospace; font-size: 0.62rem; font-weight: 700;
          color: var(--accent); background: none; border: none; cursor: pointer;
        }
        .nb-mark-all:hover { opacity: 0.75; }
        .nb-list { max-height: 360px; overflow-y: auto; }
        .nb-item {
          display: flex; gap: 10px; padding: 0.8rem 1.1rem;
          border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s;
          text-decoration: none; color: inherit;
        }
        .nb-item:last-child { border-bottom: none; }
        .nb-item:hover { background: var(--surface-2); }
        .nb-item.unread { background: var(--accent-soft); }
        .nb-icon { font-size: 1.1rem; flex-shrink: 0; line-height: 1.4; }
        .nb-body { flex: 1; min-width: 0; }
        .nb-item-title { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
        .nb-item-text { font-size: 0.74rem; color: var(--text-secondary); line-height: 1.5; }
        .nb-item-time { font-family: var(--font-jbmono), monospace; font-size: 0.6rem; color: var(--text-muted); margin-top: 4px; }
        .nb-empty { padding: 2.5rem 1rem; text-align: center; font-size: 0.78rem; color: var(--text-muted); }
      `}</style>

      <button ref={triggerRef} className="nb-trigger" onClick={() => setOpen((o) => !o)}>
        <Bell />
        {unreadCount > 0 && <span className="nb-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {mounted && panel && createPortal(panel, document.body)}
    </>
  );
} 
