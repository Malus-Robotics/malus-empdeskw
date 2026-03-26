"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function checkStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)         score++;
  if (/[A-Z]/.test(pw))      score++;
  if (/[0-9]/.test(pw))      score++;
  if (/[!@#$%^&*]/.test(pw)) score++;
  if (pw.length >= 12)        score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["", "#f87171", "#f97316", "#fbbf24", "#22d3a2", "#7c6af7"];
  return { score, label: labels[score] || "", color: colors[score] || "" };
}

function validatePassword(pw: string) {
  return /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(pw);
}

function SuccessModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="success-box" onClick={e => e.stopPropagation()}>
        <div className="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="success-title">Account Activated!</div>
        <div className="success-sub">Your password has been set. Use your Employee ID to sign in.</div>
        <div className="success-id-label">Your Employee ID</div>
        <div className="success-id">{employeeId}</div>
        <button className="success-btn" onClick={onClose}>Continue to Login</button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [shake, setShake]                     = useState(false);
  const [successId, setSuccessId]             = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("mr-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mr-theme", theme);
  }, [theme]);

  const strength  = checkStrength(password);
  const pwMatch   = confirmPassword.length > 0 && password === confirmPassword;
  const pwNoMatch = confirmPassword.length > 0 && password !== confirmPassword;

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 600); }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) { setError("Passwords do not match."); triggerShake(); return; }
    if (!validatePassword(password))  { setError("Password must be 8+ chars with an uppercase letter, number and special character."); triggerShake(); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessId(data.employeeId);
      } else {
        setError(data.error || "Activation failed. Please try again.");
        triggerShake();
      }
    } catch {
      setError("Connection error. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="12" cy="10" r="3"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, title:"Smart Attendance", desc:"Clock in/out and track shifts with live timers." },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title:"Work Analytics", desc:"Full history of hours, projects and timesheets." },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, title:"Expense Claims", desc:"Submit reimbursements with bills and track approvals." },
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="12" y1="14" x2="12" y2="18"/></svg>, title:"Leave Management", desc:"Apply for leave and track your balance." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root, [data-theme="dark"] {
          --bg:#0a0a0f; --surface:#111118; --surface-2:#16161f; --surface-3:#1c1c28;
          --border:rgba(255,255,255,0.07); --border-hover:rgba(255,255,255,0.14);
          --accent:#7c6af7; --accent-soft:rgba(124,106,247,0.12); --accent-border:rgba(124,106,247,0.25); --accent-glow:rgba(124,106,247,0.3);
          --green:#22d3a2; --green-bg:rgba(34,211,162,0.1); --green-border:rgba(34,211,162,0.2);
          --text-primary:#f0f0f8; --text-secondary:#8888aa; --text-muted:#44445a;
          --red:#f87171; --grid-line:rgba(124,106,247,0.055);
          --hero-glow-1:rgba(124,106,247,0.14); --hero-glow-2:rgba(34,211,162,0.07);
          --feat-bg:rgba(255,255,255,0.03); --feat-border:rgba(255,255,255,0.07);
          --modal-overlay:rgba(0,0,0,0.78);
        }
        [data-theme="light"] {
          --bg:#f0f1f8; --surface:#ffffff; --surface-2:#f0f1f6; --surface-3:#e8eaf0;
          --border:rgba(0,0,0,0.09); --border-hover:rgba(0,0,0,0.16);
          --accent:#6355e8; --accent-soft:rgba(99,85,232,0.08); --accent-border:rgba(99,85,232,0.25); --accent-glow:rgba(99,85,232,0.2);
          --green:#0fa87a; --green-bg:rgba(15,168,122,0.08); --green-border:rgba(15,168,122,0.2);
          --text-primary:#0f0f1a; --text-secondary:#555570; --text-muted:#9999b5;
          --red:#dc2626; --grid-line:rgba(99,85,232,0.05);
          --hero-glow-1:rgba(99,85,232,0.1); --hero-glow-2:rgba(15,168,122,0.06);
          --feat-bg:rgba(0,0,0,0.02); --feat-border:rgba(0,0,0,0.07);
          --modal-overlay:rgba(0,0,0,0.35);
        }
        * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }

        .rr-root { min-height:100vh; display:flex; background:var(--bg); font-family:'Syne',sans-serif; color:var(--text-primary); position:relative; overflow:hidden; }
        .rr-root::before { content:''; position:fixed; inset:0; background-image:linear-gradient(to right,var(--grid-line) 1px,transparent 1px),linear-gradient(to bottom,var(--grid-line) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
        .glow-1{position:fixed;top:-20%;left:-10%;width:55%;height:55%;background:radial-gradient(ellipse,var(--hero-glow-1) 0%,transparent 70%);pointer-events:none;z-index:0;}
        .glow-2{position:fixed;bottom:-15%;right:-10%;width:45%;height:45%;background:radial-gradient(ellipse,var(--hero-glow-2) 0%,transparent 70%);pointer-events:none;z-index:0;}

        .theme-btn{position:fixed;top:1.5rem;right:1.5rem;z-index:20;display:flex;align-items:center;gap:8px;padding:0.48rem 1rem;border-radius:100px;border:1px solid var(--border);background:var(--surface);color:var(--text-secondary);font-family:'Syne',sans-serif;font-size:0.7rem;font-weight:600;cursor:pointer;transition:all 0.18s;}
        .theme-btn:hover{border-color:var(--border-hover);color:var(--text-primary);}
        .theme-btn svg{width:13px;height:13px;}
        .tpill{width:28px;height:16px;border-radius:100px;background:var(--surface-3);border:1px solid var(--border);position:relative;}
        .tpill.on{background:var(--accent);border-color:var(--accent);}
        .tthumb{position:absolute;top:1px;left:1px;width:12px;height:12px;border-radius:50%;background:var(--text-muted);transition:transform 0.25s,background 0.25s;}
        .tpill.on .tthumb{transform:translateX(12px);background:#fff;}

        /* Hero */
        .rr-hero{position:relative;z-index:1;flex:1;display:none;flex-direction:column;justify-content:center;padding:4rem 4rem 4rem 5rem;border-right:1px solid var(--border);}
        @media(min-width:1024px){.rr-hero{display:flex;}}
        .hero-logo-row{display:flex;align-items:center;gap:12px;margin-bottom:2.5rem;}
        .hero-logo-mark{width:44px;height:44px;border-radius:12px;background:var(--accent);box-shadow:0 0 24px var(--accent-glow);display:flex;align-items:center;justify-content:center;}
        .hero-logo-mark svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;}
        .hero-brand{font-size:1rem;font-weight:800;letter-spacing:-0.02em;line-height:1.15;}
        .hero-brand-sub{font-size:0.58rem;color:var(--accent);font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
        .hero-title{font-size:clamp(2rem,3.5vw,3rem);font-weight:800;letter-spacing:-0.04em;line-height:1.1;margin-bottom:1rem;max-width:460px;}
        .hero-title-accent{color:var(--accent);}
        .hero-desc{font-size:0.88rem;color:var(--text-secondary);line-height:1.75;max-width:400px;margin-bottom:2.5rem;}
        .feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;}
        .feat-card{background:var(--feat-bg);border:1px solid var(--feat-border);border-radius:16px;padding:1.1rem 1.2rem;transition:border-color 0.2s,transform 0.2s;}
        .feat-card:hover{border-color:var(--accent-border);transform:translateY(-3px);}
        .feat-icon{width:34px;height:34px;border-radius:9px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;margin-bottom:0.75rem;}
        .feat-icon svg{width:16px;height:16px;stroke:var(--accent);}
        .feat-title{font-size:0.82rem;font-weight:800;color:var(--text-primary);margin-bottom:4px;}
        .feat-desc{font-size:0.7rem;color:var(--text-secondary);line-height:1.5;}
        .version-pill{display:inline-flex;align-items:center;gap:6px;margin-top:2.5rem;padding:4px 12px;border-radius:100px;border:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--text-muted);}
        .vdot{width:5px;height:5px;border-radius:50%;background:var(--green);}

        /* Form side */
        .rr-form-side{position:relative;z-index:1;width:100%;display:flex;align-items:center;justify-content:center;padding:2rem;}
        @media(min-width:1024px){.rr-form-side{width:480px;flex-shrink:0;}}

        .reg-card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--border);border-radius:26px;padding:2.25rem;box-shadow:0 32px 80px rgba(0,0,0,0.35);animation:fadeUp 0.5s ease;position:relative;}
        [data-theme="light"] .reg-card{box-shadow:0 32px 80px rgba(0,0,0,0.1);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .shake{animation:shake 0.5s ease !important;}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}

        .corner{position:absolute;width:18px;height:18px;border-color:var(--accent);border-style:solid;opacity:0.22;}
        .c-tl{top:14px;left:14px;border-width:2px 0 0 2px;border-radius:4px 0 0 0;}
        .c-tr{top:14px;right:14px;border-width:2px 2px 0 0;border-radius:0 4px 0 0;}
        .c-bl{bottom:14px;left:14px;border-width:0 0 2px 2px;border-radius:0 0 0 4px;}
        .c-br{bottom:14px;right:14px;border-width:0 2px 2px 0;border-radius:0 0 4px 0;}

        .mobile-logo{display:flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:1.5rem;}
        @media(min-width:1024px){.mobile-logo{display:none;}}
        .mobile-logo-mark{width:50px;height:50px;border-radius:14px;background:var(--accent);box-shadow:0 0 28px var(--accent-glow);display:flex;align-items:center;justify-content:center;margin-bottom:7px;animation:float 4s ease-in-out infinite;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .mobile-logo-mark svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;}
        .mobile-logo-name{font-size:1.1rem;font-weight:800;letter-spacing:-0.02em;}
        .mobile-logo-sub{font-size:0.62rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;}

        .form-heading{font-size:1.1rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:3px;}
        .form-subheading{font-size:0.7rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;margin-bottom:1.25rem;}
        .form-divider{height:1px;background:var(--border);margin-bottom:1.25rem;}

        /* Info banner — explains the new flow to the user */
        .info-banner{display:flex;align-items:flex-start;gap:9px;padding:0.75rem 0.9rem;background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:12px;margin-bottom:1.25rem;}
        .info-banner svg{width:14px;height:14px;stroke:var(--accent);flex-shrink:0;margin-top:1px;}
        .info-banner p{font-size:0.68rem;color:var(--text-secondary);line-height:1.55;}
        .info-banner strong{color:var(--text-primary);}

        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:0.85rem;}
        .field-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;}
        .field-wrap{position:relative;}
        .field-icon{position:absolute;left:0.85rem;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--text-muted);pointer-events:none;}
        .field-input{width:100%;padding:0.75rem 0.85rem 0.75rem 2.5rem;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;color:var(--text-primary);font-family:'Syne',sans-serif;font-size:0.8rem;outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
        .field-input::placeholder{color:var(--text-muted);}
        .field-input:focus{border-color:var(--accent-border);box-shadow:0 0 0 3px var(--accent-soft);}
        .field-input.mono{font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;}
        .field-input.valid{border-color:var(--green-border);}
        .field-input.invalid{border-color:rgba(248,113,113,0.3);}

        .pw-strength-row{display:flex;align-items:center;gap:8px;margin-top:5px;}
        .pw-bar-track{flex:1;height:3px;background:var(--surface-3);border-radius:100px;overflow:hidden;}
        .pw-bar-fill{height:100%;border-radius:100px;transition:width 0.4s ease,background 0.4s ease;}
        .pw-strength-label{font-family:'JetBrains Mono',monospace;font-size:0.58rem;font-weight:700;min-width:60px;text-align:right;}

        .match-row{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:0.65rem;font-family:'JetBrains Mono',monospace;font-weight:600;}
        .match-row svg{width:12px;height:12px;flex-shrink:0;}

        .policy-note{display:flex;align-items:flex-start;gap:7px;padding:0.65rem 0.85rem;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;font-size:0.66rem;color:var(--text-muted);line-height:1.55;margin-bottom:1rem;}
        .policy-note svg{width:13px;height:13px;flex-shrink:0;margin-top:1px;color:var(--text-muted);}

        .error-box{display:flex;align-items:flex-start;gap:7px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:0.55rem 0.85rem;font-size:0.7rem;color:var(--red);font-weight:600;margin-bottom:0.85rem;line-height:1.5;}
        .error-box svg{width:13px;height:13px;flex-shrink:0;margin-top:1px;}

        .submit-btn{width:100%;padding:0.82rem;border-radius:12px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;letter-spacing:0.04em;border:none;cursor:pointer;box-shadow:0 0 28px var(--accent-glow),inset 0 1px 0 rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;gap:9px;transition:all 0.2s;margin-bottom:1.25rem;}
        .submit-btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px);}
        .submit-btn:active:not(:disabled){transform:scale(0.98);}
        .submit-btn:disabled{opacity:0.45;cursor:not-allowed;transform:none;}
        .spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .login-row{text-align:center;font-size:0.72rem;color:var(--text-muted);}
        .login-link{color:var(--accent);cursor:pointer;font-weight:700;background:none;border:none;font-family:'Syne',sans-serif;font-size:0.72rem;transition:opacity 0.18s;}
        .login-link:hover{opacity:0.75;}

        .modal-overlay{position:fixed;inset:0;background:var(--modal-overlay);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:999;animation:fadeBg 0.2s ease;}
        @keyframes fadeBg{from{opacity:0}to{opacity:1}}
        .success-box{background:var(--surface);border:1px solid var(--green-border);border-radius:24px;padding:2.5rem 2.25rem;text-align:center;max-width:400px;width:calc(100vw - 2rem);animation:slideUp 0.3s ease;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .success-icon{width:56px;height:56px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;}
        .success-title{font-size:1.3rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:8px;}
        .success-sub{font-size:0.78rem;color:var(--text-secondary);line-height:1.65;margin-bottom:1.25rem;}
        .success-id-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
        .success-id{font-family:'JetBrains Mono',monospace;font-size:1.25rem;font-weight:800;color:var(--accent);letter-spacing:0.06em;background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:12px;padding:0.65rem 1.25rem;margin-bottom:1.5rem;display:inline-block;}
        .success-btn{width:100%;padding:0.8rem;border-radius:12px;background:var(--accent);color:#fff;font-family:'Syne',sans-serif;font-size:0.82rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 0 20px var(--accent-glow);transition:all 0.2s;}
        .success-btn:hover{filter:brightness(1.1);transform:translateY(-1px);}
      `}</style>

      <div className="rr-root">
        <div className="glow-1"/><div className="glow-2"/>

        {/* Theme toggle */}
        <button className="theme-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark"
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
          {theme === "dark" ? "Dark" : "Light"}
          <div className={`tpill ${theme === "light" ? "on" : ""}`}><div className="tthumb"/></div>
        </button>

        {/* Hero */}
        <aside className="rr-hero">
          <div className="hero-logo-row">
            <div className="hero-logo-mark">
              <svg viewBox="0 0 22 22"><rect x="4" y="8" width="14" height="10" rx="2"/><line x1="11" y1="4" x2="11" y2="8"/><circle cx="11" cy="3" r="1.3" fill="white" stroke="none"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/></svg>
            </div>
            <div>
              <div className="hero-brand">Malus Robotics</div>
              <div className="hero-brand-sub">Workspace Platform</div>
            </div>
          </div>
          <h1 className="hero-title">Activate Your<br/><span className="hero-title-accent">Employee</span><br/>Account</h1>
          <p className="hero-desc">Your HR or admin has already created your account. Enter your company email and set a password to activate it and gain access to the workspace.</p>
          <div className="feat-grid">
            {features.map((f, i) => (
              <div className="feat-card" key={i}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
          <div className="version-pill"><span className="vdot"/>Platform v2.0 · Malus Robotics Internal</div>
        </aside>

        {/* Form */}
        <div className="rr-form-side">
          <form className={`reg-card ${shake ? "shake" : ""}`} onSubmit={register} noValidate>
            <div className="corner c-tl"/><div className="corner c-tr"/>
            <div className="corner c-bl"/><div className="corner c-br"/>

            {/* Mobile logo */}
            <div className="mobile-logo">
              <div className="mobile-logo-mark">
                <svg viewBox="0 0 22 22"><rect x="4" y="8" width="14" height="10" rx="2"/><line x1="11" y1="4" x2="11" y2="8"/><circle cx="11" cy="3" r="1.3" fill="white" stroke="none"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/></svg>
              </div>
              <div className="mobile-logo-name">Malus Robotics</div>
              <div className="mobile-logo-sub">Workspace Platform</div>
            </div>

            <div className="form-heading">Activate Account</div>
            <div className="form-subheading">Set your password to get started</div>
            <div className="form-divider"/>

            {/* Info banner */}
            <div className="info-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>
                <strong>Your account must be created by an admin first.</strong>{" "}
                Enter your <strong>company email</strong> exactly as provided by HR, then set a password to activate.
              </p>
            </div>

            {/* Company Email */}
            <div className="field">
              <label className="field-label">Company Email</label>
              <div className="field-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input className="field-input mono" type="email" placeholder="you@malusrobotics.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">New Password</label>
              <div className="field-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input className="field-input" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password"/>
              </div>
              {password.length > 0 && (
                <div className="pw-strength-row">
                  <div className="pw-bar-track"><div className="pw-bar-fill" style={{ width:`${(strength.score/5)*100}%`, background:strength.color }}/></div>
                  <span className="pw-strength-label" style={{ color:strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="field">
              <label className="field-label">Confirm Password</label>
              <div className="field-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input className={`field-input ${pwMatch?"valid":pwNoMatch?"invalid":""}`} type="password" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password"/>
              </div>
              {pwMatch && <div className="match-row" style={{color:"var(--green)"}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Passwords match</div>}
              {pwNoMatch && <div className="match-row" style={{color:"var(--red)"}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Passwords don't match</div>}
            </div>

            {/* Policy */}
            <div className="policy-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Password must be 8+ characters with an uppercase letter, a number, and a special character (!@#$%^&*).
            </div>

            {/* Error */}
            {error && (
              <div className="error-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="submit-btn" disabled={loading || !email.trim() || !password || !confirmPassword}>
              {loading
                ? <><div className="spinner"/>Activating…</>
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Activate Account</>
              }
            </button>

            <div className="login-row">
              Already activated?{" "}
              <button type="button" className="login-link" onClick={() => router.push("/login")}>Sign in</button>
            </div>
          </form>
        </div>
      </div>

      {successId && (
        <SuccessModal employeeId={successId} onClose={() => { setSuccessId(null); router.push("/login"); }}/>
      )}
    </>
  );
}