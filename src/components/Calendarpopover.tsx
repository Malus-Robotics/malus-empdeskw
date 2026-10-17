// src/components/CalendarPopover.tsx
// NEW — a calendar button for the sidebar footer (next to the notification
// bell). Click it and the full LeaveCalendar opens as a floating panel, on
// every dashboard page. Same portal + fixed-position approach as the bell,
// so the sidebar's overflow:hidden can't clip it; opens upward when there
// isn't room below.

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import LeaveCalendar from "@/components/LeaveCalendar";

const PANEL_WIDTH = 340;
const PANEL_GAP = 10;

export default function CalendarPopover() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  function position() {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // sidebar is on the left, so open to the RIGHT of the button when there's
    // room (keeps it off the sidebar); otherwise anchor to the button's edge.
    let left = rect.right + PANEL_GAP;
    left = Math.max(16, Math.min(left, window.innerWidth - PANEL_WIDTH - 16));
    const h = panelRef.current?.offsetHeight || 480;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
    const top = spaceBelow >= h
      ? rect.bottom + PANEL_GAP
      : Math.max(16, Math.min(rect.bottom - h, window.innerHeight - h - 16));
    setPos({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    position();
    const raf = requestAnimationFrame(position);
    const t = setTimeout(position, 300); // after the calendar's own data loads
    window.addEventListener("resize", position);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener("resize", position); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) { document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey); }
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <style>{`
        .cp-trigger{width:36px;height:36px;border-radius:10px;padding:0;display:flex;align-items:center;justify-content:center;
          background:var(--surface);border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:all .18s;flex-shrink:0;}
        .cp-trigger:hover,.cp-trigger.open{background:var(--surface-2);color:var(--text-primary);border-color:var(--border-hover);}
        .cp-trigger svg{width:17px;height:17px;display:block;}
        .cp-panel{position:fixed;width:${PANEL_WIDTH}px;max-width:calc(100vw - 2rem);max-height:calc(100vh - 2rem);overflow-y:auto;
          z-index:2000;border-radius:16px;box-shadow:0 20px 56px rgba(0,0,0,.25);}
      `}</style>

      <button ref={triggerRef} className={`cp-trigger ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)}
        aria-label="Open calendar" title="Calendar">
        <CalendarDays />
      </button>

      {mounted && open && pos && createPortal(
        <div ref={panelRef} className="cp-panel" style={{ top: pos.top, left: pos.left }}>
          <LeaveCalendar />
        </div>,
        document.body
      )}
    </>
  );
}
