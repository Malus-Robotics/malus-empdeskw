// src/app/dashboard/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export default function HistoryPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me");
        const user = await res.json();
        if (!user.employeeId) return;
        setEmployeeId(user.employeeId);
        setEmployeeName(user.name || "Employee");
        const historyRes = await fetch(`/api/attendance/history?employeeId=${user.employeeId}`);
        const data = await historyRes.json();
        setHistory(data || []);
        setFiltered(data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const text = debouncedSearch.toLowerCase();
    const result = history.filter((item) => {
      if (!text) return true;
      if (filterType === "code") return item.projectCode?.toLowerCase().includes(text);
      if (filterType === "date") return item.date?.toLowerCase().includes(text);
      return (
        item.projectCode?.toLowerCase().includes(text) ||
        item.projectName?.toLowerCase().includes(text) ||
        item.date?.toLowerCase().includes(text)
      );
    });
    setFiltered(result);
  }, [debouncedSearch, filterType, history]);

  // close the notes dialog with Escape
  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedItem(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedItem]);

  const totalSessions = history.length;
  const totalProjects = new Set(history.map((h) => h.projectCode)).size;
  const totalHours = history.reduce((acc, h) => {
    const match = h.duration?.match(/(\d+)h\s*(\d+)m/);
    if (!match) return acc;
    return acc + parseInt(match[1]) + parseInt(match[2]) / 60;
  }, 0);

  const placeholder =
    filterType === "code" ? "Search by project code" : filterType === "date" ? "Search by date" : "Search project, code or date";

  return (
    <>
      <style>{`
        .hp-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:var(--font-jakarta),system-ui,sans-serif;padding:2.25rem 2rem 4rem;}
        .hp-root *,.hp-root *::before,.hp-root *::after{box-sizing:border-box;}
        .hp-inner{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:1.4rem;}

        .hp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
        .hp-title{font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;}
        .hp-sub{font-size:0.9rem;color:var(--text-muted);margin-top:6px;}
        .hp-user{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:100px;padding:6px 14px 6px 6px;box-shadow:var(--shadow-card);}
        .hp-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;}
        .hp-user-name{font-size:0.85rem;font-weight:700;line-height:1.2;}
        .hp-user-id{font-size:0.72rem;color:var(--text-muted);}

        .hp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:0.8rem;}
        .hp-kpi{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:1rem 1.2rem;box-shadow:var(--shadow-card);}
        .hp-kpi-l{display:flex;align-items:center;gap:7px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);}
        .hp-kpi-dot{width:8px;height:8px;border-radius:50%;background:var(--kc);}
        .hp-kpi-n{font-size:1.9rem;font-weight:800;letter-spacing:-0.03em;line-height:1;margin-top:10px;}
        .hp-kpi-n span{font-size:1rem;font-weight:600;color:var(--text-muted);margin-left:2px;}

        .hp-bar{display:flex;gap:0.7rem;align-items:center;flex-wrap:wrap;}
        .hp-select{height:44px;padding:0 0.9rem;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.84rem;font-weight:600;outline:none;cursor:pointer;}
        .hp-select:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .hp-search{position:relative;flex:1;min-width:220px;max-width:420px;}
        .hp-search svg.s{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-muted);}
        .hp-search input{width:100%;height:44px;padding:0 38px 0 38px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-family:inherit;font-size:0.88rem;outline:none;}
        .hp-search input::placeholder{color:var(--text-muted);}
        .hp-search input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .hp-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--text-muted);cursor:pointer;display:flex;padding:4px;}
        .hp-count{font-size:0.8rem;color:var(--text-muted);margin-left:auto;}

        .hp-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow-card);overflow:hidden;}
        .hp-wrap{overflow-x:auto;}
        .hp-table{width:100%;min-width:720px;border-collapse:collapse;}
        .hp-table th{padding:0.95rem 1.25rem;text-align:left;font-size:0.78rem;font-weight:600;color:var(--text-muted);white-space:nowrap;border-bottom:1px solid var(--border);}
        .hp-table td{padding:1rem 1.25rem;vertical-align:middle;border-bottom:1px solid var(--border);}
        .hp-table tbody tr:last-child td{border-bottom:0;}
        .hp-table tbody tr:hover{background:var(--surface-2);}
        .hp-date{font-size:0.86rem;color:var(--text-secondary);white-space:nowrap;}
        .hp-proj{font-size:0.92rem;font-weight:700;margin-bottom:3px;}
        .hp-code{font-size:0.76rem;font-weight:600;color:var(--accent);}
        .hp-timecell{font-size:0.86rem;color:var(--text-secondary);white-space:nowrap;}
        .hp-timecell i{font-style:normal;color:var(--text-muted);margin:0 6px;}
        .hp-dur{display:inline-block;font-size:0.82rem;font-weight:800;color:var(--accent);background:var(--accent-soft);border-radius:100px;padding:4px 11px;white-space:nowrap;}
        .hp-view{height:34px;padding:0 0.95rem;border-radius:10px;font-family:inherit;font-size:0.8rem;font-weight:700;cursor:pointer;white-space:nowrap;}
        .hp-view.on{background:var(--accent-soft);border:1px solid var(--accent-border);color:var(--accent);}
        .hp-view.on:hover{background:var(--accent);color:#fff;}
        .hp-view.off{background:transparent;border:1px solid var(--border);color:var(--text-muted);cursor:not-allowed;}
        .hp-empty{padding:3.5rem 1.5rem;text-align:center;color:var(--text-muted);font-size:0.9rem;line-height:1.7;}
        .hp-empty b{display:block;color:var(--text-primary);font-size:1rem;margin-bottom:4px;}

        .hp-sk{height:14px;border-radius:7px;background:linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%);background-size:200% 100%;animation:hp-sh 1.4s infinite;}
        @keyframes hp-sh{0%{background-position:200% 0}100%{background-position:-200% 0}}

        .hp-overlay{position:fixed;inset:0;background:var(--modal-overlay);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:999;padding:1rem;animation:hp-fade .2s ease;}
        @keyframes hp-fade{from{opacity:0}to{opacity:1}}
        .hp-modal{background:var(--surface);border:1px solid var(--border);border-radius:24px;width:560px;max-width:100%;max-height:90vh;overflow:auto;padding:1.8rem;box-shadow:var(--shadow-pop);animation:hp-up .22s ease;}
        @keyframes hp-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .hp-modal-h{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.2rem;}
        .hp-modal-t{font-size:1.1rem;font-weight:800;letter-spacing:-0.01em;margin-bottom:4px;}
        .hp-modal-m{font-size:0.82rem;color:var(--text-muted);}
        .hp-x{width:34px;height:34px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .hp-x:hover{color:var(--text-primary);border-color:var(--border-hover);}
        .hp-notes{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:1.1rem 1.2rem;font-size:0.9rem;line-height:1.75;color:var(--text-secondary);white-space:pre-line;min-height:100px;margin-bottom:1.3rem;}
        .hp-close{width:100%;height:44px;border-radius:12px;background:var(--accent);border:0;color:#fff;font-family:inherit;font-size:0.9rem;font-weight:700;cursor:pointer;}
        .hp-close:hover{background:var(--accent-hover);}

        @media(max-width:640px){
          .hp-root{padding:1.25rem 1rem 3rem;}
          .hp-title{font-size:1.5rem;}
          .hp-kpis{grid-template-columns:1fr;}
          .hp-card{border-radius:18px;}
          .hp-search input{font-size:16px;}
          .hp-count{margin-left:0;width:100%;}
        }
      `}</style>

      <div className="hp-root">
        <div className="hp-inner">

          <div className="hp-head">
            <div>
              <h1 className="hp-title">Work history</h1>
              <p className="hp-sub">Every session you have clocked, with the notes you added.</p>
            </div>
            {employeeName && (
              <div className="hp-user">
                <div className="hp-avatar">{employeeName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
                <div>
                  <div className="hp-user-name">{employeeName}</div>
                  <div className="hp-user-id">#{employeeId}</div>
                </div>
              </div>
            )}
          </div>

          <div className="hp-kpis">
            <div className="hp-kpi" style={{ ["--kc" as any]: "var(--accent)" }}>
              <span className="hp-kpi-l"><span className="hp-kpi-dot" />Total hours</span>
              <div className="hp-kpi-n">{totalHours.toFixed(1)}<span>h</span></div>
            </div>
            <div className="hp-kpi" style={{ ["--kc" as any]: "var(--green)" }}>
              <span className="hp-kpi-l"><span className="hp-kpi-dot" />Sessions</span>
              <div className="hp-kpi-n">{totalSessions}</div>
            </div>
            <div className="hp-kpi" style={{ ["--kc" as any]: "var(--orange)" }}>
              <span className="hp-kpi-l"><span className="hp-kpi-dot" />Projects</span>
              <div className="hp-kpi-n">{totalProjects}</div>
            </div>
          </div>

          <div className="hp-bar">
            <select className="hp-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Search in">
              <option value="all">All fields</option>
              <option value="code">Project code</option>
              <option value="date">Date</option>
            </select>
            <div className="hp-search">
              <Search size={15} className="s" />
              <input placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search sessions" />
              {search && <button className="hp-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
            </div>
            <span className="hp-count">{filtered.length} of {history.length} session{history.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="hp-card">
            <div className="hp-wrap">
              <table className="hp-table">
                <thead>
                  <tr><th>Date</th><th>Project</th><th>Time</th><th>Duration</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="hp-sk" style={{ width: 80 }} /></td>
                      <td><div className="hp-sk" style={{ width: 150, marginBottom: 8 }} /><div className="hp-sk" style={{ width: 70, height: 10 }} /></td>
                      <td><div className="hp-sk" style={{ width: 120 }} /></td>
                      <td><div className="hp-sk" style={{ width: 60 }} /></td>
                      <td><div className="hp-sk" style={{ width: 70 }} /></td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={5}>
                      <div className="hp-empty">
                        <b>{history.length === 0 ? "No sessions yet" : "No sessions match"}</b>
                        {history.length === 0 ? "Your clocked sessions will appear here." : "Try a different search or clear it."}
                      </div>
                    </td></tr>
                  )}
                  {!loading && filtered.map((item, i) => (
                    <tr key={i}>
                      <td className="hp-date">{item.date}</td>
                      <td><div className="hp-proj">{item.projectName || "No project"}</div><div className="hp-code">{item.projectCode}</div></td>
                      <td className="hp-timecell">{item.clockIn}<i>to</i>{item.clockOut}</td>
                      <td><span className="hp-dur">{item.duration}</span></td>
                      <td>
                        <button disabled={!item.timesheet} onClick={() => setSelectedItem(item)} className={`hp-view ${item.timesheet ? "on" : "off"}`}>
                          {item.timesheet ? "View notes" : "No notes"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="hp-overlay" onClick={() => setSelectedItem(null)}>
          <div className="hp-modal" role="dialog" aria-modal="true" aria-label="Timesheet details" onClick={(e) => e.stopPropagation()}>
            <div className="hp-modal-h">
              <div>
                <div className="hp-modal-t">Timesheet notes</div>
                <div className="hp-modal-m">{selectedItem.date}{selectedItem.projectName ? ` · ${selectedItem.projectName}` : ""}</div>
              </div>
              <button className="hp-x" onClick={() => setSelectedItem(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="hp-notes">{selectedItem.timesheet || "No notes were added for this session."}</div>
            <button className="hp-close" onClick={() => setSelectedItem(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
