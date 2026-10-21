// src/app/dashboard/settings/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import {
  ACCENTS, AccentKey, FontSize, Theme,
  applyAccent, applyCompact, applyFontSize, readPrefs,
} from "@/lib/prefs";
import InstallPrompt from "@/components/InstallPrompt";

const FONT_OPTIONS: { key: FontSize; label: string; sub: string; px: string }[] = [
  { key: "small",  label: "Small",   sub: "Smaller text", px: "0.85rem" },
  { key: "medium", label: "Default", sub: "Recommended",  px: "0.95rem" },
  { key: "large",  label: "Large",   sub: "Larger text",  px: "1.1rem" },
];

export default function SettingsPage() {
  const [me, setMe] = useState({ employeeId: "", name: "", email: "" });
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState<AccentKey>("indigo");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [compact, setCompact] = useState(false);
  const [notif, setNotif] = useState({ leave: true, expense: true, weekly: false });
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      setMe({ employeeId: d.employeeId || "", name: d.name || "", email: d.email || "" });
    }).catch(() => {});

    const p = readPrefs();
    setAccent(p.accent); setFontSize(p.fontSize); setCompact(p.compact); setNotif(p.notif);
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  // every change is stored on this device straight away; this just confirms it
  function flash() {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1800);
  }
  const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

  function chooseTheme(t: Theme) {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    store("mr-theme", t);
    (window as any).__setMRTheme?.(t);
    applyAccent(accent, t);
    flash();
  }
  function chooseAccent(a: AccentKey) { setAccent(a); store("mr-accent", a); applyAccent(a, theme); flash(); }
  function chooseFont(f: FontSize) { setFontSize(f); store("mr-font-size", f); applyFontSize(f); flash(); }
  function toggleCompact() { const v = !compact; setCompact(v); store("mr-compact", String(v)); applyCompact(v); flash(); }
  function toggleNotif(k: "leave" | "expense" | "weekly") {
    const next = { ...notif, [k]: !notif[k] };
    setNotif(next); store("mr-notif", JSON.stringify(next)); flash();
  }

  return (
    <>
      <style>{`
        .sp-root{min-height:100vh;background:var(--bg);color:var(--text-primary);font-family:var(--font-jakarta),system-ui,sans-serif;padding:2.25rem 2rem 4rem;overflow-x:clip;}
        .sp-root *,.sp-root *::before,.sp-root *::after{box-sizing:border-box;}
        .sp-inner{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:1.4rem;}

        .sp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;}
        .sp-title{font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;line-height:1.1;}
        .sp-sub{font-size:0.9rem;color:var(--text-muted);margin-top:6px;}
        .sp-saved{display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:700;color:var(--green);background:var(--green-soft);border:1px solid var(--green-border);border-radius:100px;padding:6px 12px;opacity:0;transform:translateY(2px);transition:opacity .2s,transform .2s;}
        .sp-saved.show{opacity:1;transform:none;}

        .sp-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:1.6rem;box-shadow:var(--shadow-card);}
        .sp-card-t{font-size:1.05rem;font-weight:800;letter-spacing:-0.01em;margin-bottom:1.3rem;}

        .sp-group + .sp-group{margin-top:1.6rem;padding-top:1.6rem;border-top:1px solid var(--border);}
        .sp-gname{font-size:0.9rem;font-weight:700;}
        .sp-gdesc{font-size:0.82rem;color:var(--text-muted);margin:3px 0 0.95rem;line-height:1.5;}

        /* theme */
        .sp-themes{display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;}
        .sp-theme{display:flex;align-items:center;gap:12px;padding:0.8rem 0.95rem;border-radius:14px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:inherit;color:inherit;text-align:left;min-height:64px;}
        .sp-theme:hover{border-color:var(--border-hover);}
        .sp-theme.on{border-color:var(--accent);background:var(--accent-soft);}
        .sp-thumb{width:44px;height:34px;border-radius:9px;border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .sp-thumb.light{background:linear-gradient(135deg,#F4F6F9,#FFFFFF);color:#475569;}
        .sp-thumb.dark{background:linear-gradient(135deg,#131313,#222);color:#e5e5e5;}
        .sp-tname{font-size:0.9rem;font-weight:700;}
        .sp-tsub{font-size:0.78rem;color:var(--text-muted);margin-top:1px;}
        .sp-tick{margin-left:auto;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;flex-shrink:0;}
        .sp-theme.on .sp-tick{opacity:1;}

        /* accent */
        .sp-accents{display:flex;gap:1rem;flex-wrap:wrap;}
        .sp-acc{display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;font-family:inherit;color:var(--text-secondary);padding:0;}
        .sp-swatch{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08);outline:2px solid transparent;outline-offset:3px;transition:outline-color .15s;}
        .sp-acc.on .sp-swatch{outline-color:var(--text-primary);}
        .sp-acc:hover .sp-swatch{outline-color:var(--border-hover);}
        .sp-acc.on:hover .sp-swatch{outline-color:var(--text-primary);}
        .sp-acc span{font-size:0.78rem;font-weight:600;}

        /* text size */
        .sp-sizes{display:grid;grid-template-columns:repeat(3,1fr);gap:0.7rem;}
        .sp-size{padding:0.75rem 0.5rem;border-radius:14px;border:1px solid var(--border);background:var(--surface);cursor:pointer;text-align:center;font-family:inherit;color:inherit;}
        .sp-size:hover{border-color:var(--border-hover);}
        .sp-size.on{border-color:var(--accent);background:var(--accent-soft);}
        .sp-size b{display:block;font-weight:800;}
        .sp-size.on b{color:var(--accent);}
        .sp-size small{display:block;font-size:0.74rem;color:var(--text-muted);margin-top:2px;}

        /* rows + switches */
        .sp-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.95rem 0;border-bottom:1px solid var(--border);}
        .sp-row:first-of-type{padding-top:0;}
        .sp-row:last-child{border-bottom:none;padding-bottom:0;}
        .sp-rname{font-size:0.9rem;font-weight:700;}
        .sp-rdesc{font-size:0.82rem;color:var(--text-muted);margin-top:3px;line-height:1.5;}
        .sp-switch{width:46px;height:26px;border-radius:100px;border:1px solid var(--border-hover);background:var(--surface-3);position:relative;cursor:pointer;flex-shrink:0;padding:0;transition:background .2s,border-color .2s;}
        .sp-switch i{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:transform .2s;}
        .sp-switch[aria-checked="true"]{background:var(--accent);border-color:var(--accent);}
        .sp-switch[aria-checked="true"] i{transform:translateX(20px);}
        .sp-note{font-size:0.78rem;color:var(--text-muted);margin-top:1rem;line-height:1.5;}

        /* account */
        .sp-acct{display:grid;grid-template-columns:130px 1fr;gap:0.2rem 1rem;align-items:baseline;padding:0.8rem 0;border-bottom:1px solid var(--border);}
        .sp-acct:first-of-type{padding-top:0;}
        .sp-acct:last-child{border-bottom:none;padding-bottom:0;}
        .sp-al{font-size:0.82rem;font-weight:600;color:var(--text-muted);}
        .sp-av{font-size:0.9rem;font-weight:700;min-width:0;overflow-wrap:anywhere;}

        .sp-switch:focus-visible,.sp-theme:focus-visible,.sp-size:focus-visible,.sp-acc:focus-visible .sp-swatch{outline:2px solid var(--accent);outline-offset:3px;}

        @media(max-width:640px){
          .sp-root{padding:1.25rem 1rem 3rem;}
          .sp-title{font-size:1.5rem;}
          .sp-card{padding:1.2rem;border-radius:18px;}
          .sp-themes{grid-template-columns:1fr;}
          .sp-acct{grid-template-columns:1fr;}
          .sp-al{font-size:0.76rem;}
        }
        @media(prefers-reduced-motion:reduce){.sp-saved,.sp-switch,.sp-switch i{transition:none;}}
      `}</style>

      <div className="sp-root">
        <div className="sp-inner">

          <div className="sp-head">
            <div>
              <h1 className="sp-title">Settings</h1>
              <p className="sp-sub">Choose how the workspace looks and what you hear about.</p>
            </div>
            <span className={`sp-saved ${saved ? "show" : ""}`} role="status" aria-live="polite">
              <Check size={14} /> Saved
            </span>
          </div>

          {/* APPEARANCE */}
          <section className="sp-card">
            <h2 className="sp-card-t">Appearance</h2>

            <div className="sp-group">
              <div className="sp-gname">Theme</div>
              <p className="sp-gdesc">Pick the look that is easiest on your eyes.</p>
              <div className="sp-themes">
                {([
                  { key: "light", label: "Light", sub: "Clean and bright", icon: <Sun size={16} />,  cls: "light" },
                  { key: "dark",  label: "Dark",  sub: "Easy at night",    icon: <Moon size={16} />, cls: "dark" },
                ] as const).map(o => (
                  <button key={o.key} type="button" className={`sp-theme ${theme === o.key ? "on" : ""}`} onClick={() => chooseTheme(o.key)} aria-pressed={theme === o.key}>
                    <span className={`sp-thumb ${o.cls}`}>{o.icon}</span>
                    <span>
                      <div className="sp-tname">{o.label}</div>
                      <div className="sp-tsub">{o.sub}</div>
                    </span>
                    <span className="sp-tick"><Check size={12} strokeWidth={3} /></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-group">
              <div className="sp-gname">Accent colour</div>
              <p className="sp-gdesc">Used for buttons, the active menu item and highlights.</p>
              <div className="sp-accents">
                {ACCENTS.map(o => (
                  <button key={o.key} type="button" className={`sp-acc ${accent === o.key ? "on" : ""}`} onClick={() => chooseAccent(o.key)} aria-pressed={accent === o.key} aria-label={`${o.label} accent`}>
                    <span className="sp-swatch" style={{ background: theme === "dark" ? o.dark : o.light }}>
                      {accent === o.key && <Check size={18} strokeWidth={3} />}
                    </span>
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-group">
              <div className="sp-gname">Text size</div>
              <p className="sp-gdesc">Makes text larger or smaller across the workspace.</p>
              <div className="sp-sizes">
                {FONT_OPTIONS.map(o => (
                  <button key={o.key} type="button" className={`sp-size ${fontSize === o.key ? "on" : ""}`} onClick={() => chooseFont(o.key)} aria-pressed={fontSize === o.key}>
                    <b style={{ fontSize: o.px }}>{o.label}</b>
                    <small>{o.sub}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-group">
              <div className="sp-row">
                <div>
                  <div className="sp-rname">Compact layout</div>
                  <div className="sp-rdesc">Tighter spacing so more fits on screen.</div>
                </div>
                <button type="button" role="switch" aria-checked={compact} aria-label="Compact layout" className="sp-switch" onClick={toggleCompact}><i /></button>
              </div>
            </div>
          </section>

          {/* INSTALL APP */}
          <section className="sp-card">
            <h2 className="sp-card-t">Install app</h2>
            <p className="sp-gdesc" style={{ marginTop: 0 }}>
              Add Employee Desk to your home screen so it opens like a normal app, full screen and one tap away.
            </p>
            <InstallPrompt />
          </section>

          {/* ACCOUNT */}
          <section className="sp-card">
            <h2 className="sp-card-t">Your account</h2>
            <div className="sp-acct"><span className="sp-al">Name</span><span className="sp-av">{me.name || "Not available"}</span></div>
            <div className="sp-acct"><span className="sp-al">Employee ID</span><span className="sp-av" style={{ color: "var(--accent)" }}>{me.employeeId || "Not available"}</span></div>
            <div className="sp-acct"><span className="sp-al">Email</span><span className="sp-av">{me.email || "Not available"}</span></div>
            <div className="sp-acct"><span className="sp-al">Version</span><span className="sp-av" style={{ color: "var(--text-muted)" }}>2.0</span></div>
          </section>

          {/* NOTIFICATIONS */}
          <section className="sp-card">
            <h2 className="sp-card-t">Notifications</h2>
            {([
              { k: "leave",   name: "Leave decisions",  desc: "Tell me when a leave request is approved or rejected." },
              { k: "expense", name: "Expense updates",  desc: "Tell me when an expense claim is approved or rejected." },
              { k: "weekly",  name: "Weekly summary",   desc: "Send me a weekly digest of my attendance and hours." },
            ] as const).map(n => (
              <div className="sp-row" key={n.k}>
                <div>
                  <div className="sp-rname">{n.name}</div>
                  <div className="sp-rdesc">{n.desc}</div>
                </div>
                <button type="button" role="switch" aria-checked={notif[n.k]} aria-label={n.name} className="sp-switch" onClick={() => toggleNotif(n.k)}><i /></button>
              </div>
            ))}
            <p className="sp-note">These choices are saved on this device only for now. The bell in the sidebar still shows every alert.</p>
          </section>

        </div>
      </div>
    </>
  );
}
