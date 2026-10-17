// src/app/dashboard/leaves/page.tsx
// REPLACES the leave/page.tsx you pasted. Same overall shape (Apply /
// History / Balance tabs) plus a new 4th tab — Policy — that renders the
// actual 2026 Leave & Holiday Policy in full, readable form (not the old
// 4-line .policy-note). Leave types are now the real 3 (Sick / Earned /
// Compensation) instead of the old fake 7. Day counts are computed as
// working days (weekly-off + holiday aware) both for the live preview here
// and authoritatively server-side in /api/leaves. Earned Leave shows a
// quarterly-usage bar and a sandwich-rule warning when relevant; Earned and
// Compensation balances are shown as "managed by HR" per the explicit
// decision not to guess at the attendance-driven accrual engine (see the
// comment block at the top of lib/leavePolicy.ts).

"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  LeaveType,
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_SHORT,
  LEAVE_TYPE_COLOR,
  LEAVE_TYPE_DESCRIPTION,
  SICK_LEAVE_ANNUAL_ENTITLEMENT,
  QUARTERLY_LIMIT_DAYS,
  MAX_CONSECUTIVE_DAYS,
  HOLIDAYS_2026,
  workingDaysBetween,
  touchesHolidayBoundary,
  quarterKey,
} from "@/lib/leavePolicy";

interface Leave {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  contactNo: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  appliedOn: string;
}

type Tab = "apply" | "history" | "balance" | "policy";

function typeLabel(t: string) {
  return (LEAVE_TYPE_LABEL as Record<string, string>)[t] || t;
}
function typeColor(t: string) {
  return (LEAVE_TYPE_COLOR as Record<string, string>)[t] || "#9ca3af";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeavesPage() {
  const [tab, setTab] = useState<Tab>("apply");
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<LeaveType>("SICK");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [contactNo, setContactNo] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (data.success) setLeaves(data.leaves);
    } catch {
      toast.error("Could not load your leave history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // live preview of what the server will compute, so the applicant sees
  // the real working-day count (and any policy flags) before submitting
  const preview = useMemo(() => {
    if (!from || !to) return null;
    if (new Date(to) < new Date(from)) return { error: "End date is before start date." };

    const days = workingDaysBetween(from, to);
    if (days === 0) return { error: "This range contains no working days (all weekly offs / holidays)." };

    let quarterUsed = 0;
    let sandwichFlag = false;
    let consecutiveFlag = false;

    if (type === "EARNED") {
      consecutiveFlag = days > MAX_CONSECUTIVE_DAYS;
      const qKey = quarterKey(from);
      quarterUsed = leaves
        .filter((l) => l.type === "EARNED" && l.status !== "REJECTED" && l.status !== "CANCELLED" && quarterKey(l.from) === qKey)
        .reduce((s, l) => s + l.days, 0);
      const { dayBefore, dayAfter } = touchesHolidayBoundary(from, to);
      sandwichFlag = !!(dayBefore || dayAfter);
    }

    let sickUsedThisYear = 0;
    if (type === "SICK") {
      const year = new Date(from).getFullYear();
      sickUsedThisYear = leaves
        .filter((l) => l.type === "SICK" && l.status !== "REJECTED" && l.status !== "CANCELLED" && new Date(l.from).getFullYear() === year)
        .reduce((s, l) => s + l.days, 0);
    }

    return { days, quarterUsed, sandwichFlag, consecutiveFlag, sickUsedThisYear };
  }, [from, to, type, leaves]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to || !reason.trim()) {
      toast.error("Please fill in dates and a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, from, to, reason, contactNo }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Could not submit leave request.");
        return;
      }
      toast.success("Leave request submitted.");
      if (data.warning) toast(data.warning, { icon: "⚠️", duration: 6000 });
      setFrom(""); setTo(""); setReason(""); setContactNo("");
      load();
      setTab("history");
    } catch {
      toast.error("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this leave request?")) return;
    try {
      const res = await fetch(`/api/leaves?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "Could not cancel."); return; }
      toast.success("Leave cancelled.");
      load();
    } catch {
      toast.error("Server error.");
    }
  }

  // balances
  const year = new Date().getFullYear();
  const sickUsedYear = leaves
    .filter((l) => l.type === "SICK" && l.status !== "REJECTED" && l.status !== "CANCELLED" && new Date(l.from).getFullYear() === year)
    .reduce((s, l) => s + l.days, 0);
  const sickBalance = Math.max(0, SICK_LEAVE_ANNUAL_ENTITLEMENT - sickUsedYear);

  const currentQKey = quarterKey(new Date().toISOString());
  const earnedUsedQuarter = leaves
    .filter((l) => l.type === "EARNED" && l.status !== "REJECTED" && l.status !== "CANCELLED" && quarterKey(l.from) === currentQKey)
    .reduce((s, l) => s + l.days, 0);

  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="leaves-page">
      <style>{`
        .leaves-page { padding: 2.2rem 2.4rem 3rem; max-width: 980px; }
        .lp-head { margin-bottom: 1.6rem; }
        .lp-title { font-size: 1.85rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); }
        .lp-sub { font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; }

        .lp-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border); margin-bottom: 1.8rem; }
        .lp-tab {
          padding: 0.7rem 1rem; font-size: 0.82rem; font-weight: 700; cursor: pointer;
          color: var(--text-muted); border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none;
          transition: color 0.15s;
        }
        .lp-tab:hover { color: var(--text-primary); }
        .lp-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .lp-tab .badge { margin-left: 6px; font-size: 0.7rem; background: var(--accent-soft); color: var(--accent); padding: 1px 6px; border-radius: 100px; }

        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.6rem; }
        .card + .card { margin-top: 1rem; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.72rem; font-weight: 700; color: var(--text-secondary);  }
        .form-group input, .form-group select, .form-group textarea {
          background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
          padding: 0.65rem 0.8rem; font-size: 0.85rem; color: var(--text-primary); font-family: inherit;
        }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.2rem; }
        .type-card {
          border: 1.5px solid var(--border); border-radius: 12px; padding: 0.9rem; cursor: pointer; transition: all 0.15s;
          background: var(--surface-2);
        }
        .type-card.active { border-color: var(--accent-border); background: var(--accent-soft); }
        .type-card .t-name { font-size: 0.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
        .type-card .t-desc { font-size: 0.7rem; color: var(--text-secondary); line-height: 1.5; }

        .preview-box { border-radius: 12px; padding: 0.9rem 1rem; margin-bottom: 1.2rem; font-size: 0.8rem; line-height: 1.6; }
        .preview-box.ok { background: var(--accent-soft); border: 1px solid var(--accent-border); color: var(--text-primary); }
        .preview-box.warn { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); color: var(--text-primary); }
        .preview-box.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: var(--text-primary); }

        .submit-btn {
          background: var(--accent); color: #fff; border: none; border-radius: 10px;
          padding: 0.75rem 1.6rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s;
        }
        .submit-btn:hover { opacity: 0.9; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .lv-row { display: flex; align-items: center; gap: 1rem; padding: 0.9rem 0; border-bottom: 1px solid var(--border); }
        .lv-row:last-child { border-bottom: none; }
        .lv-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .lv-main { flex: 1; min-width: 0; }
        .lv-type { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
        .lv-dates { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; }
        .lv-reason { font-size: 0.74rem; color: var(--text-muted); margin-top: 2px; }
        .lv-status {
          font-size: 0.7rem; font-weight: 700;
          padding: 3px 9px; border-radius: 100px; flex-shrink: 0;
        }
        .lv-status.PENDING { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
        .lv-status.APPROVED { background: rgba(34,211,162,0.12); color: #22d3a2; border: 1px solid rgba(34,211,162,0.25); }
        .lv-status.REJECTED { background: rgba(248,113,113,0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
        .lv-status.CANCELLED { background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border); }
        .lv-cancel { font-size: 0.7rem; color: var(--red); background: none; border: none; cursor: pointer; margin-left: 10px; font-weight: 700; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.85rem; }

        .bal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .bal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.4rem; }
        .bal-card .bal-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 10px; }
        .bal-card .bal-num { font-size: 2rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .bal-card .bal-note { font-size: 0.72rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.5; }
        .bal-bar-track { height: 6px; border-radius: 100px; background: var(--surface-2); margin-top: 12px; overflow: hidden; }
        .bal-bar-fill { height: 100%; border-radius: 100px; }

        .policy-section { margin-bottom: 1.8rem; }
        .policy-section h3 { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.6rem; }
        .policy-section p, .policy-section li { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.7; }
        .policy-section ul { padding-left: 1.2rem; margin-top: 0.4rem; }
        .policy-badge { display: inline-block; font-size: 0.72rem; color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent-border); padding: 2px 8px; border-radius: 100px; margin-bottom: 0.8rem; }

        table.holiday-table { width: 100%; border-collapse: collapse; margin-top: 0.6rem; font-size: 0.78rem; }
        table.holiday-table th { text-align: left; font-size: 0.65rem; letter-spacing: 0.05em; color: var(--text-muted); padding: 6px 10px; border-bottom: 1px solid var(--border); }
        table.holiday-table td { padding: 7px 10px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
        table.holiday-table tr:last-child td { border-bottom: none; }

        @media (max-width: 720px) {
          .form-row, .type-grid, .bal-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="lp-head">
        <div className="lp-title">Leaves</div>
        <div className="lp-sub">Apply for leave, track your requests, and review the Malus Robotics Leave &amp; Holiday Policy.</div>
      </div>

      <div className="lp-tabs">
        <button className={`lp-tab ${tab === "apply" ? "active" : ""}`} onClick={() => setTab("apply")}>Apply</button>
        <button className={`lp-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          History{pendingCount > 0 && <span className="badge">{pendingCount} pending</span>}
        </button>
        <button className={`lp-tab ${tab === "balance" ? "active" : ""}`} onClick={() => setTab("balance")}>Balance</button>
        <button className={`lp-tab ${tab === "policy" ? "active" : ""}`} onClick={() => setTab("policy")}>Policy</button>
      </div>

      {tab === "apply" && (
        <form className="card" onSubmit={submit}>
          <div className="type-grid">
            {LEAVE_TYPES.map((t) => (
              <div key={t} className={`type-card ${type === t ? "active" : ""}`} onClick={() => setType(t)}>
                <div className="t-name">{LEAVE_TYPE_LABEL[t]} <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>({LEAVE_TYPE_SHORT[t]})</span></div>
                <div className="t-desc">{LEAVE_TYPE_DESCRIPTION[t]}</div>
              </div>
            ))}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
          </div>

          {preview && "error" in preview && (
            <div className="preview-box error">⚠ {preview.error}</div>
          )}
          {preview && !("error" in preview) && (
            <div className={`preview-box ${preview.consecutiveFlag || preview.sandwichFlag ? "warn" : "ok"}`}>
              <strong>{preview.days} working day{preview.days !== 1 ? "s" : ""}</strong> will be deducted (weekly offs &amp; holidays excluded).
              {type === "EARNED" && (
                <>
                  <br />Quarter usage: {preview.quarterUsed} / {QUARTERLY_LIMIT_DAYS} days used so far this quarter.
                  {preview.consecutiveFlag && <><br />⚠ Exceeds the {MAX_CONSECUTIVE_DAYS}-day consecutive cap for Earned Leave.</>}
                  {preview.sandwichFlag && <><br />⚠ This range borders a declared holiday — may be flagged under the Sandwich Rule (Section 9) if you already have leave on the other side of it.</>}
                </>
              )}
              {type === "SICK" && (
                <><br />Used this year: {preview.sickUsedThisYear} / {SICK_LEAVE_ANNUAL_ENTITLEMENT} days.</>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Contact No. (while on leave)</label>
              <input type="tel" value={contactNo} onChange={(e) => setContactNo(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.2rem" }}>
            <label>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for leave" required />
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      )}

      {tab === "history" && (
        <div className="card">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : leaves.length === 0 ? (
            <div className="empty-state">No leave requests yet.</div>
          ) : (
            leaves.map((l) => (
              <div className="lv-row" key={l.id}>
                <span className="lv-dot" style={{ background: typeColor(l.type) }} />
                <div className="lv-main">
                  <div className="lv-type">{typeLabel(l.type)} · {l.days} day{l.days !== 1 ? "s" : ""}</div>
                  <div className="lv-dates">{fmtDate(l.from)} — {fmtDate(l.to)}</div>
                  <div className="lv-reason">{l.reason}</div>
                </div>
                <span className={`lv-status ${l.status}`}>{l.status}</span>
                {l.status === "PENDING" && (
                  <button className="lv-cancel" onClick={() => cancel(l.id)}>Cancel</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "balance" && (
        <div className="bal-grid">
          <div className="bal-card">
            <div className="bal-label">Sick Leave</div>
            <div className="bal-num">{sickBalance}<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}> / {SICK_LEAVE_ANNUAL_ENTITLEMENT}</span></div>
            <div className="bal-note">{sickUsedYear} day{sickUsedYear !== 1 ? "s" : ""} used this year ({year}).</div>
            <div className="bal-bar-track"><div className="bal-bar-fill" style={{ width: `${Math.min(100, (sickUsedYear / SICK_LEAVE_ANNUAL_ENTITLEMENT) * 100)}%`, background: LEAVE_TYPE_COLOR.SICK }} /></div>
          </div>
          <div className="bal-card">
            <div className="bal-label">Earned Leave</div>
            <div className="bal-num" style={{ fontSize: "1.3rem" }}>Managed by HR</div>
            <div className="bal-note">{earnedUsedQuarter} / {QUARTERLY_LIMIT_DAYS} days used this quarter. Accrues via 3 consecutive weeks (21 working days) without leave, credited the following year — ask HR for your current accrued balance.</div>
          </div>
          <div className="bal-card">
            <div className="bal-label">Compensation Leave</div>
            <div className="bal-num" style={{ fontSize: "1.3rem" }}>Managed by HR</div>
            <div className="bal-note">Credited when you work an approved holiday or weekly off. Ask HR for your current comp-off balance.</div>
          </div>
        </div>
      )}

      {tab === "policy" && (
        <div className="card">
          <span className="policy-badge">Effective 01 Jan 2026</span>

          <div className="policy-section">
            <h3>1. Purpose</h3>
            <p>This policy sets out the leave entitlements, weekly off schedule, and declared holidays for all Malus Robotics employees, to ensure fair and consistent application across the organisation.</p>
          </div>

          <div className="policy-section">
            <h3>2–4. Scope &amp; Applicability</h3>
            <p>Applies to all full-time employees of Malus Robotics. Leave is credited and tracked on a calendar-year basis unless stated otherwise below.</p>
          </div>

          <div className="policy-section">
            <h3>5. Sick Leave (SL)</h3>
            <p>Employees are entitled to <strong>{SICK_LEAVE_ANNUAL_ENTITLEMENT} days</strong> of Sick Leave per year, for personal illness, medical treatment, or recovery. Inform your manager/HR as early as reasonably possible when taking sick leave.</p>
          </div>

          <div className="policy-section">
            <h3>6. Earned Leave (EL) — Accrual</h3>
            <p>Earned Leave is accrued through <strong>3 consecutive weeks (21 scheduled working days)</strong> worked without taking leave, and is credited for use the following year. Earned Leave is for planned personal leave and requires prior approval, except in genuine emergencies.</p>
          </div>

          <div className="policy-section">
            <h3>7. Weekly Off</h3>
            <p>The 1st and 3rd Saturday of each month are weekly offs. The 2nd, 4th, and 5th Saturdays (where applicable) are working days unless separately declared otherwise. Sundays are always off.</p>
          </div>

          <div className="policy-section">
            <h3>8. Leave Planning &amp; Quarterly Limit</h3>
            <p>Planned personal (Earned) leave is capped at <strong>{QUARTERLY_LIMIT_DAYS} days per quarter</strong>, and at <strong>{MAX_CONSECUTIVE_DAYS} consecutive working days</strong> at a time. This limit does not apply to Sick Leave or genuine emergency leave, which are treated separately.</p>
          </div>

          <div className="policy-section">
            <h3>9. Sandwich Rule</h3>
            <p>Planned leave should not be taken immediately on both sides of a declared holiday (e.g. leave on the Friday and the Tuesday around a Monday holiday) without approval, as this is treated as leave spanning the holiday itself.</p>
          </div>

          <div className="policy-section">
            <h3>Compensation Leave</h3>
            <p>Employees required and approved to work on a declared holiday or weekly off are entitled to one compensatory day off, or one day's pay, as approved by their manager.</p>
          </div>

          <div className="policy-section">
            <h3>14. 2026 Holiday Calendar</h3>
            <p>Declared holidays for calendar year 2026 (Maharashtra Government notification, as circulated by Malus Robotics):</p>
            <table className="holiday-table">
              <thead><tr><th>Date</th><th>Day</th><th>Holiday</th></tr></thead>
              <tbody>
                {HOLIDAYS_2026.map((h) => (
                  <tr key={h.date}>
                    <td>{fmtDate(h.date)}</td>
                    <td>{new Date(h.date).toLocaleDateString("en-IN", { weekday: "short" })}</td>
                    <td>{h.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="policy-section" style={{ marginBottom: 0 }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
              This page reflects Malus_Robotics_Leave_Policy_2026.pdf (effective 01 Jan 2026). For the full original document or any policy exceptions, contact HR.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
