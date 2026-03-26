"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mr-theme") as "dark" | "light") || "dark";
  });

  // Load saved theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mr-theme", theme);
  }, [theme]);

  async function login() {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin");
      } else {
        setError("Invalid admin password. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPassword("");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") login();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root, [data-theme="dark"] {
          --bg: #0a0a0f;
          --surface: #111118;
          --surface-2: #16161f;
          --surface-3: #1c1c28;
          --border: rgba(255,255,255,0.07);
          --border-hover: rgba(255,255,255,0.14);
          --accent: #7c6af7;
          --accent-soft: rgba(124,106,247,0.12);
          --accent-border: rgba(124,106,247,0.25);
          --accent-glow: rgba(124,106,247,0.35);
          --text-primary: #f0f0f8;
          --text-secondary: #8888aa;
          --text-muted: #44445a;
          --red: #f87171;
          --grid-line: rgba(124,106,247,0.06);
          --card-shadow: 0 32px 80px rgba(0,0,0,0.6);
        }
        [data-theme="light"] {
          --bg: #f0f1f8;
          --surface: #ffffff;
          --surface-2: #f0f1f6;
          --surface-3: #e8eaf0;
          --border: rgba(0,0,0,0.09);
          --border-hover: rgba(0,0,0,0.16);
          --accent: #6355e8;
          --accent-soft: rgba(99,85,232,0.08);
          --accent-border: rgba(99,85,232,0.25);
          --accent-glow: rgba(99,85,232,0.2);
          --text-primary: #0f0f1a;
          --text-secondary: #555570;
          --text-muted: #9999b5;
          --red: #dc2626;
          --grid-line: rgba(99,85,232,0.06);
          --card-shadow: 0 32px 80px rgba(0,0,0,0.1);
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        .login-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Syne', sans-serif;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        /* Grid background */
        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        /* Ambient glows */
        .glow-tl {
          position: fixed;
          top: -20%;
          left: -15%;
          width: 55%;
          height: 55%;
          background: radial-gradient(ellipse, rgba(124,106,247,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .glow-br {
          position: fixed;
          bottom: -20%;
          right: -15%;
          width: 50%;
          height: 50%;
          background: radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        [data-theme="light"] .glow-tl { background: radial-gradient(ellipse, rgba(99,85,232,0.1) 0%, transparent 70%); }
        [data-theme="light"] .glow-br { background: radial-gradient(ellipse, rgba(99,85,232,0.07) 0%, transparent 70%); }

        /* Theme toggle — top right */
        .theme-btn {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.5rem 1rem;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-secondary);
          font-family: 'Syne', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
        }
        .theme-btn:hover { border-color: var(--border-hover); color: var(--text-primary); }
        .theme-btn svg { width: 13px; height: 13px; flex-shrink: 0; }
        .toggle-pill {
          width: 28px; height: 16px; border-radius: 100px;
          background: var(--surface-3); border: 1px solid var(--border);
          position: relative; transition: background 0.25s;
        }
        .toggle-pill.on { background: var(--accent); border-color: var(--accent); }
        .toggle-thumb {
          position: absolute; top: 1px; left: 1px;
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--text-muted); transition: transform 0.25s, background 0.25s;
        }
        .toggle-pill.on .toggle-thumb { transform: translateX(12px); background: #fff; }

        /* Card */
        .login-card {
          position: relative;
          z-index: 1;
          width: 420px;
          max-width: calc(100vw - 2rem);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 2.75rem 2.5rem;
          box-shadow: var(--card-shadow);
          animation: fadeUp 0.5s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .shake {
          animation: shake 0.5s ease !important;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0);   }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px);  }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px);  }
        }

        /* Logo mark */
        .logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 1.75rem;
        }
        .logo-mark {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: var(--accent);
          box-shadow: 0 0 40px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0);   }
          50%       { transform: translateY(-6px); }
        }
        .logo-mark svg { width: 28px; height: 28px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; }

        /* Headings */
        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          text-align: center;
          margin-bottom: 6px;
        }
        .login-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 2rem;
        }

        /* Divider */
        .card-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 2rem;
        }

        /* Field label */
        .field-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 6px;
          display: block;
        }

        /* Input */
        .pwd-wrap {
          position: relative;
          margin-bottom: 1rem;
        }
        .pwd-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          width: 16px;
          height: 16px;
          pointer-events: none;
        }
        .pwd-input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.75rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 13px;
          color: var(--text-primary);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          letter-spacing: 0.1em;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pwd-input::placeholder { color: var(--text-muted); letter-spacing: 0.04em; font-family: 'Syne', sans-serif; }
        .pwd-input:focus {
          border-color: var(--accent-border);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        /* Error */
        .error-msg {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 10px;
          padding: 0.6rem 0.9rem;
          font-size: 0.74rem;
          color: var(--red);
          margin-bottom: 1rem;
          font-weight: 600;
        }
        .error-msg svg { width: 14px; height: 14px; flex-shrink: 0; }

        /* Login button */
        .login-btn {
          width: 100%;
          padding: 0.9rem;
          border-radius: 13px;
          background: var(--accent);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 30px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 1.5rem;
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.12);
          transform: translateY(-1px);
          box-shadow: 0 0 44px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .login-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* Spinner */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer note */
        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.68rem;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
        }
        .login-footer-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent); opacity: 0.5;
        }

        /* Decorative corner lines */
        .corner {
          position: absolute;
          width: 20px; height: 20px;
          border-color: var(--accent);
          border-style: solid;
          opacity: 0.3;
        }
        .corner-tl { top: 16px; left: 16px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .corner-tr { top: 16px; right: 16px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
        .corner-bl { bottom: 16px; left: 16px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
        .corner-br { bottom: 16px; right: 16px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
      `}</style>

      <div className="login-root">
        {/* Ambient glows */}
        <div className="glow-tl" />
        <div className="glow-br" />

        {/* Theme toggle */}
        <button className="theme-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark"
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
          {theme === "dark" ? "Dark" : "Light"}
          <div className={`toggle-pill ${theme === "light" ? "on" : ""}`}>
            <div className="toggle-thumb" />
          </div>
        </button>

        {/* Card */}
        <div className={`login-card ${shake ? "shake" : ""}`}>
          {/* Decorative corners */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          {/* Logo */}
          <div className="logo-wrap">
            <div className="logo-mark">
              {/* Shield + robot hybrid icon */}
              <svg viewBox="0 0 28 28">
                <path d="M14 3 L24 7 L24 15 C24 20 19 24 14 26 C9 24 4 20 4 15 L4 7 Z" strokeWidth="1.5"/>
                <rect x="9" y="11" width="10" height="8" rx="2" strokeWidth="1.5"/>
                <line x1="14" y1="8" x2="14" y2="11" strokeWidth="1.5"/>
                <circle cx="14" cy="7" r="1.2" fill="white" stroke="none"/>
                <line x1="7" y1="15" x2="9" y2="15" strokeWidth="1.5"/>
                <line x1="19" y1="15" x2="21" y2="15" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>

          {/* Headings */}
          <h1 className="login-title">Malus Robotics</h1>
          <p className="login-sub">Admin Control Access</p>

          <div className="card-divider" />

          {/* Password field */}
          <label className="field-label">Admin Password</label>
          <div className="pwd-wrap">
            <svg className="pwd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              className="pwd-input"
              placeholder="Enter admin password…"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey}
              autoComplete="current-password"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="error-msg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Button */}
          <button className="login-btn" disabled={loading || !password.trim()} onClick={login}>
            {loading ? (
              <><div className="spinner" /> Authenticating…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Unlock Admin Panel
              </>
            )}
          </button>

          {/* Footer */}
          <div className="login-footer">
            <div className="login-footer-dot" />
            Restricted access
            <div className="login-footer-dot" />
            Authorized personnel only
            <div className="login-footer-dot" />
          </div>
        </div>
      </div>
    </>
  );
}