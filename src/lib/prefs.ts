// src/lib/prefs.ts
// NEW — one place for the personal display preferences (accent colour, text
// size, compact layout). The Settings page changes them; the dashboard
// layout re-applies them on every page load and theme switch, so a choice
// made in Settings actually sticks (before, it was lost on refresh).

export type Theme = "dark" | "light";
export type AccentKey = "indigo" | "blue" | "green" | "amber";
export type FontSize = "small" | "medium" | "large";

// Real colour values. "indigo" is the app's own default, so choosing it just
// removes any override and lets globals.css decide.
export const ACCENTS: { key: AccentKey; label: string; light: string; dark: string }[] = [
  { key: "indigo", label: "Indigo",  light: "#4F46E5", dark: "#6366F1" },
  { key: "blue",   label: "Sky",     light: "#0284C7", dark: "#38BDF8" },
  { key: "green",  label: "Emerald", light: "#059669", dark: "#34D399" },
  { key: "amber",  label: "Amber",   light: "#D97706", dark: "#F59E0B" },
];

// The app sizes everything in rem, so changing the root size scales all text.
const FONT_PX: Record<FontSize, string> = { small: "14px", medium: "16px", large: "18px" };

// older saved values from the previous Settings page
const LEGACY_ACCENT: Record<string, AccentKey> = { purple: "indigo", blue: "blue", green: "green", orange: "amber" };

const ACCENT_VARS = ["--accent", "--accent-soft", "--accent-border", "--accent-glow", "--accent-hover"];

export interface Prefs { accent: AccentKey; fontSize: FontSize; compact: boolean; notif: { leave: boolean; expense: boolean; weekly: boolean } }

export function readPrefs(): Prefs {
  const d: Prefs = { accent: "indigo", fontSize: "medium", compact: false, notif: { leave: true, expense: true, weekly: false } };
  try {
    const a = localStorage.getItem("mr-accent") || "";
    if (a) d.accent = (ACCENTS.some((x) => x.key === a) ? a : LEGACY_ACCENT[a]) as AccentKey || "indigo";
    const f = localStorage.getItem("mr-font-size");
    if (f === "small" || f === "medium" || f === "large") d.fontSize = f;
    d.compact = localStorage.getItem("mr-compact") === "true";
    const n = localStorage.getItem("mr-notif");
    if (n) d.notif = { ...d.notif, ...JSON.parse(n) };
  } catch { /* storage blocked: defaults are fine */ }
  return d;
}

export function applyAccent(key: AccentKey, theme: Theme) {
  const style = document.documentElement.style;
  const opt = ACCENTS.find((a) => a.key === key);
  if (!opt || key === "indigo") { ACCENT_VARS.forEach((v) => style.removeProperty(v)); return; }
  const c = theme === "dark" ? opt.dark : opt.light;
  style.setProperty("--accent", c);
  style.setProperty("--accent-soft", `color-mix(in srgb, ${c} 12%, transparent)`);
  style.setProperty("--accent-border", `color-mix(in srgb, ${c} 30%, transparent)`);
  style.setProperty("--accent-glow", `color-mix(in srgb, ${c} 32%, transparent)`);
  style.setProperty("--accent-hover", `color-mix(in srgb, ${c} 86%, black)`);
}

export function applyFontSize(f: FontSize) {
  document.documentElement.style.fontSize = f === "medium" ? "" : FONT_PX[f];
}

export function applyCompact(on: boolean) {
  if (on) document.documentElement.setAttribute("data-compact", "true");
  else document.documentElement.removeAttribute("data-compact");
}

export function applySavedPrefs(theme: Theme) {
  const p = readPrefs();
  applyAccent(p.accent, theme);
  applyFontSize(p.fontSize);
  applyCompact(p.compact);
}
