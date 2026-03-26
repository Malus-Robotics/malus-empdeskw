"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BOOT_LINES = [
  { text: "Booting Malus Robotics Core…",              delay: 0    },
  { text: "Loading industrial automation modules…",    delay: 900  },
  { text: "Connecting to Malus Cloud Infrastructure…", delay: 1800 },
  { text: "Initializing employee desk services…",      delay: 2700 },
  { text: "System ready.",                             delay: 3600 },
];

const MODULES = [
  {
    label: "Robotics Core",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <line x1="12" y1="7" x2="12" y2="11"/>
        <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none"/>
        <line x1="1" y1="15" x2="3" y2="15"/>
        <line x1="21" y1="15" x2="23" y2="15"/>
        <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/>
        <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: "Malus Cloud",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
  },
  {
    label: "Authentication",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    label: "Attendance DB",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    label: "Expense Engine",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    label: "Leave Module",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();

  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [moduleStates, setModuleStates] = useState<("idle" | "loading" | "online")[]>(
    MODULES.map(() => "idle")
  );

  // Boot sequence
  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
        // Advance progress
        setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
        // Flip module states in sync
        setModuleStates(prev => {
          const next = [...prev];
          if (i < MODULES.length) next[i] = "loading";
          if (i > 0 && i - 1 < MODULES.length) next[i - 1] = "online";
          return next;
        });
        // Last line
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => {
            setDone(true);
            // Flip remaining modules to online
            setModuleStates(MODULES.map(() => "online"));
          }, 600);
          setTimeout(() => router.push("/login"), 2000);
        }
      }, line.delay);
    });
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --accent: #7c6af7;
          --accent-glow: rgba(124,106,247,0.3);
          --accent-soft: rgba(124,106,247,0.1);
          --accent-border: rgba(124,106,247,0.2);
          --green: #22d3a2;
          --surface: #0e0e16;
          --surface-2: #13131e;
          --surface-3: #191927;
          --border: rgba(255,255,255,0.06);
          --text-primary: #f0f0f8;
          --text-secondary: #8888aa;
          --text-muted: #44445a;
          --terminal-bg: #07070f;
          --terminal-text: #a89ef9;
          --terminal-prompt: #7c6af7;
        }

        body { background: #07070f; }

        .boot-root {
          min-height: 100vh;
          background: #07070f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
          padding: 1rem;
        }

        /* Grid */
        .boot-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(to right, rgba(124,106,247,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(124,106,247,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        /* Glows */
        .glow-tl {
          position: fixed; top: -25%; left: -15%; width: 60%; height: 60%;
          background: radial-gradient(ellipse, rgba(124,106,247,0.14) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .glow-br {
          position: fixed; bottom: -25%; right: -15%; width: 55%; height: 55%;
          background: radial-gradient(ellipse, rgba(34,211,162,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* Main card */
        .boot-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 780px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 2.75rem;
          box-shadow: 0 0 0 1px rgba(124,106,247,0.08), 0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(124,106,247,0.08);
          animation: fadeUp 0.8s ease;
          overflow: hidden;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }

        /* Scan line effect */
        .boot-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--accent) 60%, transparent 100%);
          opacity: 0.6;
          animation: scanline 3s ease-in-out infinite;
        }
        @keyframes scanline {
          0%   { transform: translateY(0); opacity: 0.6; }
          50%  { opacity: 0.3; }
          100% { transform: translateY(400px); opacity: 0; }
        }

        /* Header */
        .boot-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 2rem;
        }
        .boot-logo-row { display: flex; align-items: center; gap: 12px; }
        .boot-logo-mark {
          width: 46px; height: 46px; border-radius: 13px;
          background: var(--accent);
          box-shadow: 0 0 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .boot-logo-mark svg { width: 22px; height: 22px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; }
        .boot-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text-primary); line-height: 1; margin-bottom: 3px; }
        .boot-subtitle { font-size: 0.65rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
        .system-status {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid rgba(34,211,162,0.2);
          background: rgba(34,211,162,0.08);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem; font-weight: 700;
          color: var(--green); letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%{box-shadow:0 0 0 0 rgba(34,211,162,0.4)} 70%{box-shadow:0 0 0 6px transparent} 100%{box-shadow:0 0 0 0 transparent} }

        /* Module grid */
        .module-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
          margin-bottom: 1.75rem;
        }
        @media (max-width: 600px) { .module-grid { grid-template-columns: repeat(2, 1fr); } }

        .module-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0.9rem 1rem;
          display: flex; align-items: center; gap: 9px;
          transition: border-color 0.3s, background 0.3s;
          position: relative; overflow: hidden;
        }
        .module-card.loading {
          border-color: rgba(124,106,247,0.3);
          background: rgba(124,106,247,0.06);
        }
        .module-card.online {
          border-color: rgba(34,211,162,0.2);
          background: rgba(34,211,162,0.05);
        }
        .module-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(124,106,247,0.06) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .module-card.loading::before { opacity: 1; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .module-icon-wrap {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-3); border: 1px solid var(--border);
          transition: background 0.3s, border-color 0.3s;
        }
        .module-card.loading .module-icon-wrap { background: var(--accent-soft); border-color: var(--accent-border); color: var(--accent); }
        .module-card.online .module-icon-wrap { background: rgba(34,211,162,0.1); border-color: rgba(34,211,162,0.2); color: var(--green); }
        .module-icon-wrap svg { width: 14px; height: 14px; color: var(--text-muted); transition: color 0.3s; }

        .module-info { flex: 1; min-width: 0; }
        .module-name { font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; transition: color 0.3s; }
        .module-card.online .module-name { color: var(--text-primary); }

        .module-state-chip {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.52rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px;
        }
        .chip-idle    { background: var(--surface-3); color: var(--text-muted); }
        .chip-loading { background: var(--accent-soft); color: var(--accent); }
        .chip-online  { background: rgba(34,211,162,0.1); color: var(--green); }

        /* Terminal */
        .terminal {
          background: var(--terminal-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.25rem 1.4rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          line-height: 1.75;
          min-height: 130px;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .terminal-bar {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tb-dot { width: 10px; height: 10px; border-radius: 50%; }
        .terminal-label { font-size: 0.6rem; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-left: auto; }

        .terminal-line { display: flex; align-items: baseline; gap: 8px; animation: lineIn 0.35s ease; }
        @keyframes lineIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .terminal-prompt { color: var(--terminal-prompt); font-weight: 700; flex-shrink: 0; }
        .terminal-text { color: var(--terminal-text); }
        .terminal-text.success { color: var(--green); }
        .terminal-cursor { display: inline-block; width: 8px; height: 14px; background: var(--terminal-prompt); animation: blink 1s step-end infinite; vertical-align: middle; margin-left: 4px; border-radius: 1px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Progress */
        .progress-section { margin-bottom: 1.75rem; }
        .progress-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .progress-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .progress-pct { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; color: var(--accent); }
        .progress-track { height: 6px; background: var(--surface-3); border-radius: 100px; overflow: hidden; border: 1px solid var(--border); }
        .progress-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%);
          box-shadow: 0 0 12px rgba(124,106,247,0.5);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute; top: 0; right: 0; bottom: 0; width: 60px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
          animation: glide 1.5s ease-in-out infinite;
        }
        @keyframes glide { 0%{opacity:0} 50%{opacity:1} 100%{opacity:0} }

        /* Footer */
        .boot-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border);
        }
        .boot-tagline { font-size: 0.68rem; color: var(--text-muted); letter-spacing: 0.08em; font-family: 'JetBrains Mono', monospace; }
        .boot-tagline span { color: var(--accent); }
        .redirect-note {
          display: flex; align-items: center; gap: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem; color: var(--text-muted); letter-spacing: 0.05em;
        }
        .redirect-spinner {
          width: 14px; height: 14px;
          border: 1.5px solid rgba(124,106,247,0.2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          opacity: 0;
          transition: opacity 0.4s;
        }
        .redirect-spinner.show { opacity: 1; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="boot-root">
        <div className="glow-tl" />
        <div className="glow-br" />

        <div className="boot-card">
          {/* Header */}
          <div className="boot-header">
            <div className="boot-logo-row">
              <div className="boot-logo-mark">
                <svg viewBox="0 0 22 22">
                  <rect x="4" y="8" width="14" height="10" rx="2"/>
                  <line x1="11" y1="4" x2="11" y2="8"/>
                  <circle cx="11" cy="3" r="1.3" fill="white" stroke="none"/>
                  <line x1="2" y1="12" x2="4" y2="12"/>
                  <line x1="18" y1="12" x2="20" y2="12"/>
                </svg>
              </div>
              <div>
                <div className="boot-title">Malus Robotics</div>
                <div className="boot-subtitle">Industrial Automation Platform</div>
              </div>
            </div>
            <div className="system-status">
              <span className="status-dot" />
              System Online
            </div>
          </div>

          {/* Module status grid */}
          <div className="module-grid">
            {MODULES.map((mod, i) => {
              const state = moduleStates[i];
              return (
                <div key={i} className={`module-card ${state}`}>
                  <div className="module-icon-wrap">
                    {mod.icon}
                  </div>
                  <div className="module-info">
                    <div className="module-name">{mod.label}</div>
                    <span className={`module-state-chip ${state === "idle" ? "chip-idle" : state === "loading" ? "chip-loading" : "chip-online"}`}>
                      {state === "idle" ? "Standby" : state === "loading" ? "Loading…" : "Online"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal */}
          <div className="terminal">
            <div className="terminal-bar">
              <div className="tb-dot" style={{ background: "#f87171" }} />
              <div className="tb-dot" style={{ background: "#fbbf24" }} />
              <div className="tb-dot" style={{ background: "#22d3a2" }} />
              <span className="terminal-label">boot.log</span>
            </div>
            {BOOT_LINES.map((line, i) =>
              visibleLines.includes(i) ? (
                <div className="terminal-line" key={i}>
                  <span className="terminal-prompt">›</span>
                  <span className={`terminal-text ${i === BOOT_LINES.length - 1 ? "success" : ""}`}>
                    {line.text}
                  </span>
                </div>
              ) : null
            )}
            {!done && <span className="terminal-cursor" />}
          </div>

          {/* Progress bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">System Initialization</span>
              <span className="progress-pct">{progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Footer */}
          <div className="boot-footer">
            <div className="boot-tagline">
              Dream it <span>·</span> Design it <span>·</span> Deploy it
            </div>
            <div className="redirect-note">
              <div className={`redirect-spinner ${done ? "show" : ""}`} />
              {done ? "Redirecting to login…" : "Initializing…"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}