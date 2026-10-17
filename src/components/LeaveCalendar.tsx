// src/components/LeaveCalendar.tsx
// NEW — month calendar for the Attendance (front) page. Shows, in one grid:
//   • today (accent ring)
//   • declared holidays (green, name on hover/click)  — from lib/leavePolicy.ts
//   • weekly offs: Sundays + 1st & 3rd Saturdays (greyed)
//   • YOUR leaves from /api/leaves — solid dot = approved, hollow dot = pending,
//     coloured by leave type (Sick / Earned / Compensation)
// Click any day to see what it is. Month arrows + "Today" to navigate.
// Uses only the global theme variables, so it follows light/dark automatically.

"use client";

import { useEffect, useMemo, useState } from "react";
import { HOLIDAYS_2026, isWeeklyOff, LEAVE_TYPE_COLOR, LEAVE_TYPE_LABEL } from "@/lib/leavePolicy";

interface Leave {
  id: string; type: string; from: string; to: string; days: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOLIDAY_BY_KEY = new Map(HOLIDAYS_2026.map((h) => [h.date, h.name]));

const key = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// expand a leave's from..to (stored as UTC-midnight dates) into YYYY-MM-DD keys
function leaveKeys(l: Leave): string[] {
  const out: string[] = [];
  const cur = new Date(l.from.slice(0, 10) + "T00:00:00Z");
  const end = new Date(l.to.slice(0, 10) + "T00:00:00Z");
  while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return out;
}

export default function LeaveCalendar() {
  const now = new Date();
  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [selected, setSelected] = useState<string>(todayKey);

  useEffect(() => {
    fetch("/api/leaves").then((r) => r.json()).then((d) => {
      if (d?.success) setLeaves(d.leaves.filter((l: Leave) => l.status === "APPROVED" || l.status === "PENDING"));
    }).catch(() => {});
  }, []);

  // date key -> leaves on that day
  const leaveMap = useMemo(() => {
    const map = new Map<string, Leave[]>();
    for (const l of leaves) for (const k of leaveKeys(l)) map.set(k, [...(map.get(k) || []), l]);
    return map;
  }, [leaves]);

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const monthLabel = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const shift = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const selHoliday = HOLIDAY_BY_KEY.get(selected);
  const selLeaves = leaveMap.get(selected) || [];
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selOff = isWeeklyOff(new Date(sy, sm - 1, sd));
  const selLabel = new Date(sy, sm - 1, sd).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="lc-card">
      <style>{`
        .lc-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.25rem;box-shadow:var(--shadow-card);}
        .lc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.9rem;}
        .lc-title{font-size:0.95rem;font-weight:700;color:var(--text-primary);}
        .lc-nav{display:flex;align-items:center;gap:6px;}
        .lc-btn{height:28px;min-width:28px;padding:0 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;}
        .lc-btn:hover{background:var(--surface-2);color:var(--text-primary);border-color:var(--border-hover);}
        .lc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
        .lc-dow{text-align:center;font-size:0.68rem;font-weight:600;color:var(--text-muted);padding:4px 0;}
        .lc-day{position:relative;aspect-ratio:1/1;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-primary);font-size:0.78rem;font-weight:500;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-family:inherit;padding:0;}
        .lc-day:hover{background:var(--surface-2);}
        .lc-day.empty{visibility:hidden;}
        .lc-day.off{background:var(--surface-2);color:var(--text-muted);}
        .lc-day.holiday{background:var(--green-soft);color:var(--green);font-weight:700;}
        .lc-day.today{border-color:var(--accent);color:var(--accent);font-weight:700;}
        .lc-day.selected{box-shadow:0 0 0 2px var(--accent-soft);background:var(--accent-soft);}
        .lc-dots{display:flex;gap:2px;height:6px;}
        .lc-dot{width:6px;height:6px;border-radius:50%;}
        .lc-dot.pending{background:transparent !important;border:1.5px solid currentColor;}
        .lc-info{margin-top:0.9rem;padding:0.75rem 0.9rem;border-radius:12px;background:var(--surface-2);border:1px solid var(--border);}
        .lc-info-date{font-size:0.78rem;font-weight:700;color:var(--text-primary);margin-bottom:4px;}
        .lc-info-line{font-size:0.74rem;color:var(--text-secondary);line-height:1.6;display:flex;align-items:center;gap:6px;}
        .lc-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:0.8rem;font-size:0.68rem;color:var(--text-muted);}
        .lc-legend span{display:inline-flex;align-items:center;gap:5px;}
        .lc-sw{width:9px;height:9px;border-radius:3px;display:inline-block;}
      `}</style>

      <div className="lc-head">
        <div className="lc-title">{monthLabel}</div>
        <div className="lc-nav">
          <button className="lc-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <button className="lc-btn" onClick={() => { setView({ y: now.getFullYear(), m: now.getMonth() }); setSelected(todayKey); }}>Today</button>
          <button className="lc-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
      </div>

      <div className="lc-grid">
        {WEEKDAYS.map((d) => <div className="lc-dow" key={d}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div className="lc-day empty" key={i} />;
          const k = key(view.y, view.m, d);
          const holiday = HOLIDAY_BY_KEY.get(k);
          const off = isWeeklyOff(new Date(view.y, view.m, d));
          const dayLeaves = leaveMap.get(k) || [];
          const cls = ["lc-day", holiday ? "holiday" : off ? "off" : "", k === todayKey ? "today" : "", k === selected ? "selected" : ""].join(" ");
          return (
            <button key={i} className={cls} title={holiday || undefined} onClick={() => setSelected(k)}>
              {d}
              <span className="lc-dots">
                {dayLeaves.slice(0, 3).map((l) => {
                  const c = (LEAVE_TYPE_COLOR as Record<string, string>)[l.type] || "var(--accent)";
                  return <span key={l.id} className={`lc-dot ${l.status === "PENDING" ? "pending" : ""}`} style={{ background: c, color: c }} />;
                })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="lc-info">
        <div className="lc-info-date">{selLabel}</div>
        {selHoliday && <div className="lc-info-line">Holiday: {selHoliday}</div>}
        {!selHoliday && selOff && <div className="lc-info-line">Weekly off</div>}
        {selLeaves.map((l) => (
          <div className="lc-info-line" key={l.id}>
            <span className="lc-dot" style={{ background: (LEAVE_TYPE_COLOR as Record<string, string>)[l.type] }} />
            {(LEAVE_TYPE_LABEL as Record<string, string>)[l.type] || l.type} · {l.status === "APPROVED" ? "Approved" : "Pending approval"}
          </div>
        ))}
        {!selHoliday && !selOff && selLeaves.length === 0 && <div className="lc-info-line">Working day, no leave.</div>}
      </div>

      <div className="lc-legend">
        <span><i className="lc-sw" style={{ background: "var(--green-soft)", border: "1px solid var(--green)" }} />Holiday</span>
        <span><i className="lc-sw" style={{ background: "var(--surface-3)" }} />Weekly off</span>
        <span><i className="lc-dot" style={{ background: "#22d3a2" }} />Approved leave</span>
        <span><i className="lc-dot" style={{ border: "1.5px solid #22d3a2" }} />Pending</span>
      </div>
    </div>
  );
}
