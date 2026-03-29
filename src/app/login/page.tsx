"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [shake, setShake]           = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mr-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mr-theme", theme);
  }, [theme]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Login successful");
        router.push("/dashboard");
      } else {
        setError(data.error || "Invalid credentials. Please try again.");
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

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: "Smart Attendance",
      desc: "Clock in/out, live session timer, and project tracking in one place.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      title: "Work Analytics",
      desc: "Full history of hours, sessions, and project codes across all timesheets.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      title: "Expense Claims",
      desc: "Submit reimbursements with bills, track approvals, and manage advances.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="12" y1="14" x2="12" y2="18"/>
        </svg>
      ),
      title: "Leave Management",
      desc: "Apply for leave, track balances, and get notified on approvals.",
    },
  ];

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
          --accent-glow: rgba(124,106,247,0.3);
          --green: #22d3a2;
          --text-primary: #f0f0f8;
          --text-secondary: #8888aa;
          --text-muted: #44445a;
          --red: #f87171;
          --grid-line: rgba(124,106,247,0.06);
          --hero-glow-1: rgba(124,106,247,0.15);
          --hero-glow-2: rgba(34,211,162,0.08);
          --feat-bg: rgba(255,255,255,0.03);
          --feat-border: rgba(255,255,255,0.07);
          --hero-title: #f0f0f8;
          --hero-sub: #8888aa;
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
          --green: #0fa87a;
          --text-primary: #0f0f1a;
          --text-secondary: #555570;
          --text-muted: #9999b5;
          --red: #dc2626;
          --grid-line: rgba(99,85,232,0.055);
          --hero-glow-1: rgba(99,85,232,0.1);
          --hero-glow-2: rgba(15,168,122,0.07);
          --feat-bg: rgba(0,0,0,0.02);
          --feat-border: rgba(0,0,0,0.07);
          --hero-title: #0f0f1a;
          --hero-sub: #555570;
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        /* ── ROOT ── */
        .lr-root {
          min-height: 100vh;
          display: flex;
          background: var(--bg);
          font-family: 'Syne', sans-serif;
          color: var(--text-primary);
          position: relative;
          overflow: hidden;
        }

        /* Grid */
        .lr-root::before {
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

        /* Glow orbs */
        .glow-1 {
          position: fixed; top: -20%; left: -10%; width: 55%; height: 55%;
          background: radial-gradient(ellipse, var(--hero-glow-1) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .glow-2 {
          position: fixed; bottom: -15%; right: -10%; width: 45%; height: 45%;
          background: radial-gradient(ellipse, var(--hero-glow-2) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* Theme toggle */
        .theme-btn {
          position: fixed; top: 1.5rem; right: 1.5rem; z-index: 20;
          display: flex; align-items: center; gap: 8px;
          padding: 0.48rem 1rem; border-radius: 100px;
          border: 1px solid var(--border); background: var(--surface);
          color: var(--text-secondary); font-family: 'Syne', sans-serif;
          font-size: 0.7rem; font-weight: 600; cursor: pointer;
          transition: all 0.18s;
        }
        .theme-btn:hover { border-color: var(--border-hover); color: var(--text-primary); }
        .theme-btn svg { width: 13px; height: 13px; }
        .tpill {
          width: 28px; height: 16px; border-radius: 100px;
          background: var(--surface-3); border: 1px solid var(--border); position: relative;
        }
        .tpill.on { background: var(--accent); border-color: var(--accent); }
        .tthumb {
          position: absolute; top: 1px; left: 1px; width: 12px; height: 12px;
          border-radius: 50%; background: var(--text-muted);
          transition: transform 0.25s, background 0.25s;
        }
        .tpill.on .tthumb { transform: translateX(12px); background: #fff; }

        /* ── HERO SIDE ── */
        .lr-hero {
          position: relative; z-index: 1;
          flex: 1; display: none; flex-direction: column;
          justify-content: center; padding: 4rem 4rem 4rem 5rem;
          border-right: 1px solid var(--border);
        }
        @media (min-width: 1024px) { .lr-hero { display: flex; } }

        .hero-logo-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 2.5rem;
        }
        .hero-logo-mark {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--accent); box-shadow: 0 0 24px var(--accent-glow);
          display: flex; align-items: center; justify-content: center;
        }
        .hero-logo-mark svg { width: 22px; height: 22px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; }
        .hero-brand { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); }
        .hero-brand-sub { font-size: 0.58rem; color: var(--accent); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; }

        .hero-title {
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: var(--hero-title);
          margin-bottom: 1rem;
          max-width: 480px;
        }
        .hero-title-accent { color: var(--accent); }
        .hero-desc {
          font-size: 0.9rem;
          color: var(--hero-sub);
          line-height: 1.75;
          max-width: 400px;
          margin-bottom: 2.5rem;
        }

        /* Feature cards */
        .feat-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;
        }
        .feat-card {
          background: var(--feat-bg);
          border: 1px solid var(--feat-border);
          border-radius: 16px;
          padding: 1.1rem 1.2rem;
          transition: border-color 0.2s, transform 0.2s;
          cursor: default;
        }
        .feat-card:hover { border-color: var(--accent-border); transform: translateY(-3px); }
        .feat-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: var(--accent-soft); border: 1px solid var(--accent-border);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.75rem;
        }
        .feat-icon svg { width: 16px; height: 16px; stroke: var(--accent); }
        .feat-title { font-size: 0.82rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
        .feat-desc { font-size: 0.7rem; color: var(--text-secondary); line-height: 1.5; }

        /* Version pill */
        .version-pill {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 2.5rem;
          padding: 4px 12px; border-radius: 100px;
          border: 1px solid var(--border);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem; color: var(--text-muted); letter-spacing: 0.06em;
        }
        .version-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); }

        /* ── LOGIN SIDE ── */
        .lr-form-side {
          position: relative; z-index: 1;
          width: 100%; max-width: 100%;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
        }
        @media (min-width: 1024px) { .lr-form-side { width: 480px; flex-shrink: 0; } }

        /* Card */
        .login-card {
          width: 100%; max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 26px;
          padding: 2.5rem 2.25rem;
          box-shadow: 0 32px 80px rgba(0,0,0,0.35);
          animation: fadeUp 0.5s ease;
          position: relative;
        }
        [data-theme="light"] .login-card { box-shadow: 0 32px 80px rgba(0,0,0,0.1); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .shake { animation: shake 0.5s ease !important; }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)}
          40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)}
        }

        /* Corner accents */
        .corner { position:absolute; width:18px; height:18px; border-color:var(--accent); border-style:solid; opacity:0.25; }
        .c-tl{top:14px;left:14px;border-width:2px 0 0 2px;border-radius:4px 0 0 0;}
        .c-tr{top:14px;right:14px;border-width:2px 2px 0 0;border-radius:0 4px 0 0;}
        .c-bl{bottom:14px;left:14px;border-width:0 0 2px 2px;border-radius:0 0 0 4px;}
        .c-br{bottom:14px;right:14px;border-width:0 2px 2px 0;border-radius:0 0 4px 0;}

        /* Mobile-only logo */
        .mobile-logo {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          margin-bottom: 1.75rem;
        }
        @media (min-width: 1024px) { .mobile-logo { display: none; } }
        .mobile-logo-mark {
          width: 52px; height: 52px; border-radius: 14px;
          background: var(--accent); box-shadow: 0 0 28px var(--accent-glow);
          display: flex; align-items: center; justify-content: center;
          animation: float 4s ease-in-out infinite;
          margin-bottom: 8px;
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .mobile-logo-mark svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; }
        .mobile-logo-name { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; }
        .mobile-logo-sub { font-size: 0.65rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }

        /* Form heading */
        .form-heading { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; }
        .form-subheading { font-size: 0.72rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; margin-bottom: 1.75rem; }

        /* Divider */
        .form-divider { height: 1px; background: var(--border); margin-bottom: 1.75rem; }

        /* Field */
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; }
        .field-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
        .field-wrap { position: relative; }
        .field-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: var(--text-muted); pointer-events: none; }
        .field-input {
          width: 100%;
          padding: 0.8rem 0.9rem 0.8rem 2.5rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Syne', sans-serif;
          font-size: 0.82rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-soft); }
        .field-input.mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em; }

        /* Error */
        .error-box {
          display: flex; align-items: center; gap: 7px;
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
          border-radius: 10px; padding: 0.55rem 0.85rem;
          font-size: 0.72rem; color: var(--red); font-weight: 600;
          margin-bottom: 1rem;
        }
        .error-box svg { width: 13px; height: 13px; flex-shrink: 0; }

        /* Submit */
        .submit-btn {
          width: 100%; padding: 0.85rem; border-radius: 12px;
          background: var(--accent); color: #fff;
          font-family: 'Syne', sans-serif; font-size: 0.82rem; font-weight: 700;
          letter-spacing: 0.04em; border: none; cursor: pointer;
          box-shadow: 0 0 28px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: all 0.2s;
          margin-top: 0.25rem; margin-bottom: 1.5rem;
        }
        .submit-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 0 40px var(--accent-glow); }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Spinner */
        .spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Register link */
        .register-row {
          text-align: center; font-size: 0.72rem; color: var(--text-muted);
        }
        .register-link {
          color: var(--accent); cursor: pointer; font-weight: 700;
          background: none; border: none; font-family: 'Syne', sans-serif;
          font-size: 0.72rem; transition: opacity 0.18s;
        }
        .register-link:hover { opacity: 0.75; }

        /* Footer restricted note */
        .restricted-note {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          font-size: 0.62rem; color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
          margin-top: 0.85rem;
        }
        .rd { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); opacity: 0.45; }
      `}</style>

      <div className="lr-root">
        <div className="glow-1" />
        <div className="glow-2" />

        {/* Theme toggle */}
        <button className="theme-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark"
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
          {theme === "dark" ? "Dark" : "Light"}
          <div className={`tpill ${theme === "light" ? "on" : ""}`}><div className="tthumb" /></div>
        </button>

        {/* ── HERO SIDE ── */}
        <aside className="lr-hero">
          <div className="hero-logo-row">
            <div className="hero-logo-mark">
              <svg viewBox="0 0 22 22"><rect x="4" y="8" width="14" height="10" rx="2"/><line x1="11" y1="4" x2="11" y2="8"/><circle cx="11" cy="3" r="1.3" fill="white" stroke="none"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/></svg>
            </div>
            <div>
              <div className="hero-brand">Malus Robotics</div>
              <div className="hero-brand-sub">Workspace Platform</div>
            </div>
          </div>

          <h1 className="hero-title">
            Industrial<br />
            <span className="hero-title-accent">Automation</span><br />
            Workspace
          </h1>

          <p className="hero-desc">
            Access the internal engineering platform to manage attendance,
            track PLC and robotics projects, and submit daily timesheets —
            all in one place.
          </p>

          <div className="feat-grid">
            {features.map((f, i) => (
              <div className="feat-card" key={i}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="version-pill">
            <span className="version-dot" />
            Platform v2.0 · Malus Robotics Internal
          </div>
        </aside>

        {/* ── FORM SIDE ── */}
        <div className="lr-form-side">
          <form className={`login-card ${shake ? "shake" : ""}`} onSubmit={login} noValidate>
            {/* Corner accents */}
            <div className="corner c-tl" /><div className="corner c-tr" />
            <div className="corner c-bl" /><div className="corner c-br" />

            {/* Mobile-only logo */}
            <div className="mobile-logo">
              <div className="mobile-logo-mark">
                <svg viewBox="0 0 22 22"><rect x="4" y="8" width="14" height="10" rx="2"/><line x1="11" y1="4" x2="11" y2="8"/><circle cx="11" cy="3" r="1.3" fill="white" stroke="none"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/></svg>
              </div>
              <div className="mobile-logo-name">Malus Robotics</div>
              <div className="mobile-logo-sub">Workspace Platform</div>
            </div>

            <div className="form-heading">Employee Login</div>
            <div className="form-subheading">Sign in to your workspace account</div>
            <div className="form-divider" />

            {/* Employee ID */}
            <div className="field">
              <label className="field-label">Employee ID</label>
              <div className="field-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input
                  className="field-input mono"
                  placeholder="e.g. MRPL-20XX-XXXX"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  type="password"
                  className="field-input"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="submit-btn" disabled={loading || !employeeId.trim() || !password.trim()}>
              {loading ? (
                <><div className="spinner" /> Signing in…</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Sign In
                </>
              )}
            </button>

            {/* Register */}
            <div className="register-row">
              New employee?{" "}
              <button type="button" className="register-link" onClick={() => router.push("/register")}>
                Get your Employee ID
              </button>
            </div>

            {/* Restricted */}
            <div className="restricted-note">
              <span className="rd" />Authorized personnel only<span className="rd" />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}