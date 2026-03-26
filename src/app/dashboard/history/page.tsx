"use client";

import { useEffect, useState } from "react";

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

  const totalSessions = history.length;
  const totalProjects = new Set(history.map((h) => h.projectCode)).size;
  const totalHours = history.reduce((acc, h) => {
    const match = h.duration?.match(/(\d+)h\s*(\d+)m/);
    if (!match) return acc;
    return acc + parseInt(match[1]) + parseInt(match[2]) / 60;
  }, 0);

  return (
    <>
      <style>{`
        :root, [data-theme="dark"] {
          --bg: #0a0a0f; --surface: #111118; --surface-2: #16161f; --surface-3: #1c1c28;
          --border: rgba(255,255,255,0.06); --border-hover: rgba(255,255,255,0.12);
          --accent: #7c6af7; --accent-soft: rgba(124,106,247,0.12); --accent-border: rgba(124,106,247,0.2);
          --accent-glow: rgba(124,106,247,0.25);
          --text-primary: #f0f0f8; --text-secondary: #8888aa; --text-muted: #44445a;
          --modal-overlay: rgba(0,0,0,0.7);
        }
        [data-theme="light"] {
          --bg: #f4f5f9; --surface: #ffffff; --surface-2: #f0f1f6; --surface-3: #e8eaf0;
          --border: rgba(0,0,0,0.08); --border-hover: rgba(0,0,0,0.15);
          --accent: #6355e8; --accent-soft: rgba(99,85,232,0.08); --accent-border: rgba(99,85,232,0.2);
          --accent-glow: rgba(99,85,232,0.15);
          --text-primary: #0f0f1a; --text-secondary: #555570; --text-muted: #9999b5;
          --modal-overlay: rgba(0,0,0,0.35);
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        .hp-root { min-height: 100vh; background: var(--bg); font-family: 'Syne', sans-serif; color: var(--text-primary); padding: 2.5rem 2rem 4rem; position: relative; }
        .hp-root::before { content: ''; position: fixed; top: -20%; right: -10%; width: 50%; height: 50%; background: radial-gradient(ellipse, rgba(124,106,247,0.05) 0%, transparent 70%); pointer-events: none; }
        .hp-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }

        .hp-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
        .hp-title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
        .hp-subtitle { font-size: 0.75rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; }
        .hp-user-name { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; text-align: right; }
        .hp-user-id { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); letter-spacing: 0.08em; text-align: right; }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 1.4rem 1.6rem; position: relative; overflow: hidden; transition: border-color 0.2s; }
        .stat-card:hover { border-color: var(--border-hover); }
        .stat-card::before { content: ''; position: absolute; bottom: -20px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: var(--accent); opacity: 0.04; pointer-events: none; }
        .stat-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }
        .stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; line-height: 1; }
        .stat-value span { font-size: 1rem; font-weight: 600; color: var(--text-muted); margin-left: 2px; }

        .filter-bar { display: flex; gap: 0.75rem; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 0.6rem 1rem; }
        .filter-select { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-secondary); font-family: 'Syne', sans-serif; font-size: 0.75rem; font-weight: 600; padding: 0.5rem 0.8rem; border-radius: 9px; outline: none; cursor: pointer; }
        .filter-select:focus { border-color: var(--accent-border); }
        .filter-divider { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }
        .filter-input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-family: 'Syne', sans-serif; font-size: 0.82rem; min-width: 0; }
        .filter-input::placeholder { color: var(--text-muted); }
        .filter-count { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); flex-shrink: 0; letter-spacing: 0.05em; }

        .table-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
        .hp-table { width: 100%; border-collapse: collapse; }
        .hp-table thead tr { border-bottom: 1px solid var(--border); }
        .hp-table th { padding: 0.85rem 1.25rem; text-align: left; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
        .hp-table tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s; }
        .hp-table tbody tr:last-child { border-bottom: none; }
        .hp-table tbody tr:hover { background: var(--surface-2); }
        .hp-table td { padding: 0.95rem 1.25rem; vertical-align: middle; }
        .td-date { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; }
        .td-project-name { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; }
        .td-project-code { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase; }
        .td-time { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; }
        .td-time-arrow { color: var(--text-muted); margin: 0 4px; }
        .td-duration { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; font-weight: 700; color: var(--accent); }
        .view-btn { padding: 0.4rem 1rem; border-radius: 8px; font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 700; cursor: pointer; border: none; outline: none; transition: all 0.18s; }
        .view-btn.enabled { background: var(--accent-soft); border: 1px solid var(--accent-border); color: var(--accent); }
        .view-btn.enabled:hover { filter: brightness(1.1); box-shadow: 0 0 12px var(--accent-glow); }
        .view-btn.disabled { background: var(--surface-3); border: 1px solid var(--border); color: var(--text-muted); cursor: not-allowed; }
        .table-empty { padding: 4rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        .shimmer-block { height: 14px; border-radius: 6px; background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .shimmer-row td { padding: 1rem 1.25rem; }

        .modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; animation: fadeBg 0.2s ease; }
        @keyframes fadeBg { from { opacity: 0; } to { opacity: 1; } }
        .modal-box { background: var(--surface); border: 1px solid var(--border-hover); border-radius: 22px; width: 520px; max-width: calc(100vw - 2rem); padding: 2rem; animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
        .modal-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); margin-bottom: 4px; }
        .modal-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); }
        .modal-close { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-3); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.18s; flex-shrink: 0; }
        .modal-close:hover { background: var(--surface-2); color: var(--text-primary); border-color: var(--border-hover); }
        .modal-body { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem; font-size: 0.82rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-line; min-height: 100px; margin-bottom: 1.5rem; font-family: 'JetBrains Mono', monospace; }
        .modal-footer-btn { width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--surface-3); border: 1px solid var(--border); color: var(--text-secondary); font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.18s; }
        .modal-footer-btn:hover { background: var(--surface-2); border-color: var(--border-hover); color: var(--text-primary); }
      `}</style>

      <div className="hp-root">
        <div className="hp-inner">
          <div className="hp-header">
            <div>
              <h1 className="hp-title">Analytics</h1>
              <p className="hp-subtitle">Employee Performance Overview</p>
            </div>
            <div>
              <div className="hp-user-name">{employeeName}</div>
              <div className="hp-user-id">#{employeeId}</div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value">{totalHours.toFixed(1)}<span>h</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Sessions</div>
              <div className="stat-value">{totalSessions}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Projects</div>
              <div className="stat-value">{totalProjects}</div>
            </div>
          </div>

          <div className="filter-bar">
            <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Fields</option>
              <option value="code">Project Code</option>
              <option value="date">Date</option>
            </select>
            <div className="filter-divider" />
            <input className="filter-input"
              placeholder={filterType === "code" ? "Search project code..." : filterType === "date" ? "Search date..." : "Search everything..."}
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="filter-count">{filtered.length} results</span>
          </div>

          <div className="table-card">
            <table className="hp-table">
              <thead>
                <tr>
                  <th>Date</th><th>Project</th><th>Time</th><th>Duration</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="shimmer-row">
                    <td><div className="shimmer-block" style={{ width: "70px" }} /></td>
                    <td><div className="shimmer-block" style={{ width: "120px", marginBottom: "6px" }} /><div className="shimmer-block" style={{ width: "60px", height: "10px" }} /></td>
                    <td><div className="shimmer-block" style={{ width: "100px" }} /></td>
                    <td><div className="shimmer-block" style={{ width: "55px" }} /></td>
                    <td><div className="shimmer-block" style={{ width: "50px" }} /></td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="table-empty">No results found</td></tr>
                )}
                {!loading && filtered.map((item, i) => (
                  <tr key={i}>
                    <td className="td-date">{item.date}</td>
                    <td><div className="td-project-name">{item.projectName || "—"}</div><div className="td-project-code">{item.projectCode}</div></td>
                    <td className="td-time">{item.clockIn}<span className="td-time-arrow">→</span>{item.clockOut}</td>
                    <td className="td-duration">{item.duration}</td>
                    <td>
                      <button disabled={!item.timesheet} onClick={() => setSelectedItem(item)} className={`view-btn ${item.timesheet ? "enabled" : "disabled"}`}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Timesheet Details</div>
                <div className="modal-meta">{selectedItem.date} · {selectedItem.projectName}</div>
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="modal-body">{selectedItem.timesheet || "No timesheet provided."}</div>
            <button className="modal-footer-btn" onClick={() => setSelectedItem(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}