"use client";
import { useEffect, useState } from "react";

type Mode = "checking" | "installed" | "prompt" | "ios" | "manual";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null);
  const [mode, setMode] = useState<Mode>("checking");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (standalone) { setMode("installed"); return; }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setMode(isIos ? "ios" : "manual");

    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e); setMode("prompt"); };
    const onInstalled = () => { setEvt(null); setMode("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!evt) return;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setMode("installed");
    setEvt(null);
  }

  const note: React.CSSProperties = {
    fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5,
  };

  if (mode === "checking") return null;

  if (mode === "installed") return <p style={note}>Employee Desk is installed on this device.</p>;

  if (mode === "prompt") {
    return (
      <button
        type="button"
        onClick={install}
        style={{
          background: "var(--accent)", color: "#fff", border: 0, borderRadius: 12,
          padding: "0 1.25rem", minHeight: 44, fontSize: "0.9rem", fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Install Employee Desk
      </button>
    );
  }

  if (mode === "ios") {
    return <p style={note}>To install on iPhone: tap the Share button in Safari, then choose “Add to Home Screen”.</p>;
  }

  return (
    <p style={note}>
      To install, open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.
      If you don&apos;t see it, open this page in Chrome or Edge.
    </p>
  );
}
