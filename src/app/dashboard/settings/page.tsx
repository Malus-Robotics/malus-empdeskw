"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";
type AccentColor = "purple" | "blue" | "green" | "orange";
type FontSize = "small" | "medium" | "large";

const ACCENT_OPTIONS: { key: AccentColor; label: string; dark: string; light: string }[] = [
  { key: "purple", label: "Violet",   dark: "#7c6af7", light: "#6355e8" },
  { key: "blue",   label: "Blue",     dark: "#38bdf8", light: "#0284c7" },
  { key: "green",  label: "Emerald",  dark: "#22d3a2", light: "#0fa87a" },
  { key: "orange", label: "Amber",    dark: "#f97316", light: "#ea6c0a" },
];

export default function SettingsPage() {
  const [employeeId, setEmployeeId]   = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [email, setEmail]             = useState("");

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mr-theme") as Theme) || "dark";
  });
  const [accent, setAccentState]       = useState<AccentColor>("purple");
  const [fontSize, setFontSizeState]   = useState<FontSize>("medium");
  const [compactMode, setCompactMode]  = useState(false);
  const [saved, setSaved]             = useState(false);

  // ── Load all settings on mount ──
  useEffect(() => {
    // Load user
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.employeeId) setEmployeeId(d.employeeId);
      if (d.name)       setEmployeeName(d.name);
      if (d.email)      setEmail(d.email);
    }).catch(() => {});

    // Load saved prefs
    const savedTheme   = localStorage.getItem("mr-theme")      as Theme       | null;
    const savedAccent  = localStorage.getItem("mr-accent")     as AccentColor | null;
    const savedFont    = localStorage.getItem("mr-font-size")  as FontSize    | null;
    const savedCompact = localStorage.getItem("mr-compact");

    if (savedTheme)   setThemeState(savedTheme);
    if (savedAccent)  setAccentState(savedAccent);
    if (savedFont)    setFontSizeState(savedFont);
    if (savedCompact) setCompactMode(savedCompact === "true");
  }, []);

  // ── Apply theme ──
  function applyTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("mr-theme", t);
    // Notify layout
    if ((window as any).__setMRTheme) (window as any).__setMRTheme(t);
  }

  // ── Apply accent color ──
  function applyAccent(a: AccentColor) {
    setAccentState(a);
    localStorage.setItem("mr-accent", a);
    const opt    = ACCENT_OPTIONS.find(o => o.key === a)!;
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const color  = isDark ? opt.dark : opt.light;
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-glow", color + "44");
    document.documentElement.style.setProperty("--accent-border", color + "40");
    document.documentElement.style.setProperty("--accent-soft", color + "18");
  }

  // ── Apply font size ──
  function applyFontSize(f: FontSize) {
    setFontSizeState(f);
    localStorage.setItem("mr-font-size", f);
    const map = { small: "13px", medium: "14px", large: "16px" };
    document.documentElement.style.setProperty("--base-font-size", map[f]);
  }

  // ── Apply compact ──
  function applyCompact(v: boolean) {
    setCompactMode(v);
    localStorage.setItem("mr-compact", String(v));
  }

  // ── Save confirmation flash ──
  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <style>{`
        :root, [data-theme="dark"] {
          --bg:#0a0a0f; --surface:#111118; --surface-2:#16161f; --surface-3:#1c1c28;
          --border:rgba(255,255,255,0.06); --border-hover:rgba(255,255,255,0.12);
          --accent:#7c6af7; --accent-soft:rgba(124,106,247,0.12); --accent-border:rgba(124,106,247,0.2); --accent-glow:rgba(124,106,247,0.25);
          --green:#22d3a2; --green-bg:rgba(34,211,162,0.1); --green-border:rgba(34,211,162,0.2);
          --orange:#f97316; --red:#f87171;
          --text-primary:#f0f0f8; --text-secondary:#8888aa; --text-muted:#44445a;
        }
        [data-theme="light"] {
          --bg:#f4f5f9; --surface:#ffffff; --surface-2:#f0f1f6; --surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.08); --border-hover:rgba(0,0,0,0.15);
          --accent:#6355e8; --accent-soft:rgba(99,85,232,0.08); --accent-border:rgba(99,85,232,0.2); --accent-glow:rgba(99,85,232,0.15);
          --green:#0fa87a; --green-bg:rgba(15,168,122,0.08); --green-border:rgba(15,168,122,0.2);
          --orange:#ea6c0a; --red:#dc2626;
          --text-primary:#0f0f1a; --text-secondary:#555570; --text-muted:#9999b5;
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        .sp-root { min-height:100vh; background:var(--bg); font-family:'Syne',sans-serif; color:var(--text-primary); padding:2.5rem 2rem 4rem; }
        .sp-inner { max-width:720px; margin:0 auto; display:flex; flex-direction:column; gap:1.75rem; }

        /* Header */
        .sp-header { padding-bottom:1.5rem; border-bottom:1px solid var(--border); }
        .sp-title { font-size:1.8rem; font-weight:800; letter-spacing:-0.03em; margin-bottom:5px; }
        .sp-subtitle { font-size:0.75rem; color:var(--text-muted); font-family:'JetBrains Mono',monospace; letter-spacing:0.05em; }

        /* Card */
        .sp-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:1.75rem; }
        .section-label { font-size:0.6rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-bottom:1.25rem; }

        /* Setting row */
        .setting-row { display:flex; align-items:center; justify-content:space-between; padding:0.9rem 0; border-bottom:1px solid var(--border); gap:1rem; }
        .setting-row:last-child { border-bottom:none; padding-bottom:0; }
        .setting-row:first-of-type { padding-top:0; }
        .setting-info { flex:1; min-width:0; }
        .setting-name { font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:3px; }
        .setting-desc { font-size:0.72rem; color:var(--text-muted); line-height:1.5; }

        /* Toggle */
        .toggle-pill { width:40px; height:22px; border-radius:100px; background:var(--surface-3); border:1px solid var(--border); position:relative; cursor:pointer; transition:background 0.25s; flex-shrink:0; }
        .toggle-pill.on { background:var(--accent); border-color:var(--accent); }
        .toggle-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--text-muted); transition:transform 0.25s,background 0.25s; }
        .toggle-pill.on .toggle-thumb { transform:translateX(18px); background:#fff; }

        /* Theme selector */
        .theme-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
        .theme-option {
          display:flex; align-items:center; gap:10px; padding:0.85rem 1rem;
          border-radius:13px; border:1px solid var(--border); background:var(--surface-2);
          cursor:pointer; transition:all 0.18s;
        }
        .theme-option:hover { border-color:var(--border-hover); }
        .theme-option.selected { border-color:var(--accent-border); background:var(--accent-soft); }
        .theme-preview { width:36px; height:28px; border-radius:7px; border:1px solid var(--border); overflow:hidden; flex-shrink:0; position:relative; }
        .theme-preview-dark { background:linear-gradient(135deg,#0a0a0f 0%,#111118 100%); }
        .theme-preview-light { background:linear-gradient(135deg,#f4f5f9 0%,#ffffff 100%); }
        .theme-preview-dot { position:absolute; bottom:4px; right:4px; width:6px; height:6px; border-radius:50%; }
        .theme-label { font-size:0.82rem; font-weight:700; color:var(--text-primary); }
        .theme-sub { font-size:0.65rem; color:var(--text-muted); }
        .theme-check { margin-left:auto; width:16px; height:16px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.18s; flex-shrink:0; }
        .theme-option.selected .theme-check { opacity:1; }
        .theme-check svg { width:9px; height:9px; stroke:#fff; }

        /* Accent picker */
        .accent-grid { display:flex; gap:10px; flex-wrap:wrap; }
        .accent-swatch {
          width:36px; height:36px; border-radius:10px; cursor:pointer;
          border:2px solid transparent; transition:all 0.18s;
          display:flex; align-items:center; justify-content:center;
          position:relative;
        }
        .accent-swatch.selected { border-color:#fff; transform:scale(1.1); }
        .accent-swatch svg { width:14px; height:14px; stroke:#fff; opacity:0; transition:opacity 0.18s; }
        .accent-swatch.selected svg { opacity:1; }
        .accent-label { font-size:0.65rem; color:var(--text-muted); margin-top:6px; text-align:center; font-family:'JetBrains Mono',monospace; }

        /* Font size */
        .font-grid { display:flex; gap:8px; }
        .font-option {
          flex:1; padding:0.6rem; border-radius:10px; border:1px solid var(--border);
          background:var(--surface-2); cursor:pointer; text-align:center; transition:all 0.18s;
        }
        .font-option:hover { border-color:var(--border-hover); }
        .font-option.selected { border-color:var(--accent-border); background:var(--accent-soft); color:var(--accent); }
        .font-option-label { font-weight:700; color:var(--text-primary); }
        .font-option.selected .font-option-label { color:var(--accent); }
        .font-option-sub { font-size:0.62rem; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:2px; }

        /* Account info */
        .account-row { display:flex; align-items:center; gap:12px; padding:0.85rem 0; border-bottom:1px solid var(--border); }
        .account-row:last-child { border-bottom:none; }
        .account-label { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); font-family:'JetBrains Mono',monospace; width:100px; flex-shrink:0; }
        .account-value { font-size:0.82rem; font-weight:600; color:var(--text-primary); font-family:'JetBrains Mono',monospace; }

        /* Save button */
        .save-row { display:flex; align-items:center; justify-content:flex-end; gap:1rem; }
        .save-confirm { display:flex; align-items:center; gap:7px; font-size:0.75rem; font-weight:600; color:var(--green); font-family:'JetBrains Mono',monospace; animation:fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .save-confirm svg { width:14px; height:14px; }
      `}</style>

      <div className="sp-root">
        <div className="sp-inner">

          {/* Header */}
          <div className="sp-header">
            <h1 className="sp-title">Settings</h1>
            <p className="sp-subtitle">Manage your workspace preferences</p>
          </div>

          {/* ── APPEARANCE ── */}
          <div className="sp-card">
            <div className="section-label">Appearance</div>

            {/* Theme */}
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"4px" }}>Theme</div>
              <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"0.85rem" }}>Choose how the workspace looks to you.</div>
              <div className="theme-grid">
                {([
                  { key:"dark",  label:"Dark Mode",  sub:"Easy on the eyes",     previewClass:"theme-preview-dark",  dotColor:"#7c6af7" },
                  { key:"light", label:"Light Mode",  sub:"Clean and bright",     previewClass:"theme-preview-light", dotColor:"#6355e8" },
                ] as const).map(opt => (
                  <div key={opt.key} className={`theme-option ${theme === opt.key ? "selected" : ""}`} onClick={() => applyTheme(opt.key)}>
                    <div className={`theme-preview ${opt.previewClass}`}>
                      <div className="theme-preview-dot" style={{ background: opt.dotColor }} />
                    </div>
                    <div>
                      <div className="theme-label">{opt.label}</div>
                      <div className="theme-sub">{opt.sub}</div>
                    </div>
                    <div className="theme-check">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"4px" }}>Accent Color</div>
              <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"0.85rem" }}>Applied to buttons, active states, and highlights.</div>
              <div className="accent-grid">
                {ACCENT_OPTIONS.map(opt => {
                  const color = theme === "dark" ? opt.dark : opt.light;
                  return (
                    <div key={opt.key} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <div
                        className={`accent-swatch ${accent === opt.key ? "selected" : ""}`}
                        style={{ background: color, borderColor: accent === opt.key ? "var(--text-primary)" : "transparent" }}
                        onClick={() => applyAccent(opt.key)}
                      >
                        {accent === opt.key && (
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <div className="accent-label">{opt.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Font size */}
            <div style={{ marginBottom:"1.25rem" }}>
              <div style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"4px" }}>Font Size</div>
              <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"0.85rem" }}>Adjust text size across the workspace.</div>
              <div className="font-grid">
                {([
                  { key:"small",  label:"Small",  sub:"13px" },
                  { key:"medium", label:"Medium", sub:"14px" },
                  { key:"large",  label:"Large",  sub:"16px" },
                ] as const).map(opt => (
                  <div key={opt.key} className={`font-option ${fontSize === opt.key ? "selected" : ""}`} onClick={() => applyFontSize(opt.key)}>
                    <div className="font-option-label" style={{ fontSize: opt.sub }}>{opt.label}</div>
                    <div className="font-option-sub">{opt.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact mode */}
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Compact Mode</div>
                <div className="setting-desc">Reduce spacing and padding for a denser layout.</div>
              </div>
              <div className={`toggle-pill ${compactMode ? "on" : ""}`} onClick={() => applyCompact(!compactMode)}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          {/* ── ACCOUNT INFO ── */}
          <div className="sp-card">
            <div className="section-label">Account</div>
            <div className="account-row">
              <span className="account-label">Name</span>
              <span className="account-value">{employeeName || "—"}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Employee ID</span>
              <span className="account-value" style={{ color:"var(--accent)" }}>{employeeId || "—"}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Email</span>
              <span className="account-value">{email || "—"}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Version</span>
              <span className="account-value" style={{ color:"var(--text-muted)" }}>v2.0 · Malus Robotics</span>
            </div>
          </div>

          {/* ── NOTIFICATIONS (placeholder) ── */}
          <div className="sp-card">
            <div className="section-label">Notifications</div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Leave Approval Alerts</div>
                <div className="setting-desc">Get notified when your leave request is approved or rejected.</div>
              </div>
              <div className="toggle-pill on"><div className="toggle-thumb" /></div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Expense Status Updates</div>
                <div className="setting-desc">Get notified when an expense claim is actioned.</div>
              </div>
              <div className="toggle-pill on"><div className="toggle-thumb" /></div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-name">Weekly Summary Email</div>
                <div className="setting-desc">Receive a weekly digest of your attendance and hours.</div>
              </div>
              <div className="toggle-pill"><div className="toggle-thumb" /></div>
            </div>
          </div>

          {/* Save row */}
          <div className="save-row">
            {saved && (
              <div className="save-confirm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Preferences saved
              </div>
            )}
            <button
              onClick={() => flashSaved()}
              style={{
                padding:"0.8rem 2rem", borderRadius:"12px",
                background:"var(--accent)", color:"#fff",
                fontFamily:"'Syne',sans-serif", fontSize:"0.82rem", fontWeight:700,
                border:"none", cursor:"pointer",
                boxShadow:"0 0 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15)",
                transition:"all 0.2s",
              }}
              onMouseOver={e => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseOut={e  => (e.currentTarget.style.filter = "")}
            >
              Save Preferences
            </button>
          </div>

        </div>
      </div>
    </>
  );
}