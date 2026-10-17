// apply-pm-theme.mjs
// Run from the ROOT of malus-employee-desk:   node apply-pm-theme.mjs
// Preview only (changes nothing):             node apply-pm-theme.mjs --dry
//
// WHY THIS EXISTS: swapping globals.css + layout.tsx isn't enough, because
// your individual pages each carry their own copy of the OLD theme —
//   • hard-coded  font-family: 'Syne' / 'JetBrains Mono'
//   • a per-page  :root / [data-theme] { --bg:#0a0a0f; --accent:#7c6af7 ... }
//     block that overrides globals.css
//   • an @import of the Syne/JetBrains Google font
//   • hard-coded old purple/green/etc. hex colours
// so the new theme never reaches them. This script rewrites all of that in
// src/ so every page reads the one global theme (PM-tool fonts + colours).
// Every changed file is first copied into ./.theme-backup/ so it's reversible.

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const PLAIN = process.argv.includes("--plain-labels"); // optional: drop ALL-CAPS + wide tracking like the PM tool
const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const BACKUP = path.join(ROOT, ".theme-backup");

if (!fs.existsSync(SRC)) {
  console.error("No ./src folder here — run this from the project root (where package.json is).");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

// every variable globals.css (v5) defines. Any OTHER variable found in a
// per-page theme block is kept (in a trimmed block) so nothing breaks.
const GLOBAL_VARS = new Set(`bg surface surface-2 surface-3 border border-hover accent accent-soft accent-border accent-glow
green green-bg green-soft green-border orange orange-soft orange-border red red-soft red-border yellow yellow-soft yellow-border
purple purple-soft purple-border text-primary text-secondary text-muted topbar-bg modal-overlay shadow-card background foreground
timer-bg timer-border timer-glow timer-label timer-meta-label timer-meta-val timer-inactive timer-divider btn-out-bg btn-out-color`.split(/\s+/));

const UI_FONT = "var(--font-syne), system-ui, sans-serif";
const MONO_FONT = "var(--font-jbmono), ui-monospace, monospace";

// old palette -> theme variable (hex)
const HEX_MAP = {
  // accent (old purple dark / light)
  "#7c6af7": "var(--accent)", "#6355e8": "var(--accent)", "#a78bfa": "var(--purple)", "#7c3aed": "var(--purple)",
  // green
  "#22d3a2": "var(--green)", "#3ecf8e": "var(--green)", "#0fa87a": "var(--green)",
  // red / yellow / orange
  "#f87171": "var(--red)", "#dc2626": "var(--red)",
  "#fbbf24": "var(--yellow)", "#d97706": "var(--yellow)",
  "#f97316": "var(--orange)", "#ea6c0a": "var(--orange)",
  // old neutrals
  "#0a0a0f": "var(--bg)", "#f4f5f9": "var(--bg)",
  "#111118": "var(--surface)",
  "#16161f": "var(--surface-2)", "#f0f1f6": "var(--surface-2)",
  "#1c1c28": "var(--surface-3)", "#e8eaf0": "var(--surface-3)",
  "#f0f0f8": "var(--text-primary)", "#0f0f1a": "var(--text-primary)",
  "#8888aa": "var(--text-secondary)", "#555570": "var(--text-secondary)", "#9999b5": "var(--text-secondary)",
  "#44445a": "var(--text-muted)",
};
// old palette -> theme variable (rgb triplets, used with alpha)
const RGB_MAP = {
  "124,106,247": "--accent", "99,85,232": "--accent",
  "34,211,162": "--green", "15,168,122": "--green",
  "248,113,113": "--red", "220,38,38": "--red",
  "251,191,36": "--yellow", "217,119,6": "--yellow",
  "249,115,22": "--orange", "234,108,10": "--orange",
};

function cssTransforms(css, stats) {
  let s = css;

  // 1) google-font @import for the old fonts
  s = s.replace(/@import\s+url\(\s*['"]?https?:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g, () => { stats.imports++; return ""; });

  // 2) per-page variable blocks (:root / [data-theme=...]) that define --bg or --surface.
  //    Declarations globals.css already owns are dropped; unknown ones are kept.
  const sel = String.raw`(?:html)?(?::root|\[data-theme=["'](?:dark|light)["']\])`;
  const block = new RegExp(String.raw`(^|\n)([ \t]*)(${sel}(?:\s*,\s*${sel})*)\s*\{([^{}]*--(?:bg|surface)\s*:[^{}]*)\}`, "g");
  s = s.replace(block, (_m, lead, indent, selector, body) => {
    stats.blocks++;
    const keep = body.split(";").map((d) => d.trim()).filter(Boolean).filter((d) => {
      const m = d.match(/^(--[\w-]+)\s*:/);
      return m && !GLOBAL_VARS.has(m[1].slice(2));
    });
    if (!keep.length) return lead;
    stats.kept += keep.length;
    return `${lead}${indent}${selector}{${keep.join(";")};}`;
  });

  // 3) font-family declarations naming Syne / JetBrains Mono
  s = s.replace(/font-family\s*:\s*[^;}`]*(Syne|JetBrains)[^;}`]*/g, (m) => {
    stats.fonts++;
    return "font-family: " + (/JetBrains/.test(m) ? MONO_FONT : UI_FONT);
  });

  // 4) hard-coded old hex colours
  s = s.replace(/#[0-9a-fA-F]{6}\b/g, (h) => {
    const v = HEX_MAP[h.toLowerCase()];
    if (v) { stats.colors++; return v; }
    return h;
  });
  // 5) rgba(old rgb, alpha) -> color-mix on the theme variable
  s = s.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (m, r, g, b, a) => {
    const v = RGB_MAP[`${r},${g},${b}`];
    if (!v) return m;
    stats.colors++;
    return `color-mix(in srgb, var(${v}) ${Math.round(parseFloat(a) * 100)}%, transparent)`;
  });
  if (PLAIN) {
    s = s.replace(/text-transform\s*:\s*uppercase/g, () => { stats.colors++; return "text-transform:none"; });
    s = s.replace(/letter-spacing\s*:\s*0?\.(?:0[4-9]|[1-9]\d*)em/g, () => { stats.colors++; return "letter-spacing:0"; });
  }
  return s;
}

function transformFile(file, text, stats) {
  if (file.endsWith(".css")) return cssTransforms(text, stats);

  // inside <style>{`...`}</style> template literals — full CSS treatment
  let out = text.replace(/(<style[^>]*>\s*\{\s*`)([\s\S]*?)(`\s*\}\s*<\/style>)/g,
    (_m, a, css, c) => a + cssTransforms(css, stats) + c);

  // quoted colour literals used as style values, e.g. color:"#22d3a2" / bg:"rgba(34,211,162,0.1)"
  out = out.replace(/(["'])(#[0-9a-fA-F]{6})\1/g, (m, q, h) => {
    const v = HEX_MAP[h.toLowerCase()];
    if (!v) return m; stats.colors++; return `${q}${v}${q}`;
  });
  out = out.replace(/(["'])rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)\1/g, (m, q, r, g, b, a) => {
    const v = RGB_MAP[`${r},${g},${b}`];
    if (!v) return m; stats.colors++;
    return `${q}color-mix(in srgb, var(${v}) ${Math.round(parseFloat(a) * 100)}%, transparent)${q}`;
  });

  // default theme: light (matches the PM tool) when nothing is saved yet
  out = out.replace(/(mr-theme[^\n]*\|\|\s*)(["'])dark\2/g, (_m, a, q) => { stats.colors++; return `${a}${q}light${q}`; });
  out = out.replace(/(typeof window === "undefined"\)\s*return\s*)(["'])dark\2/g, (_m, a, q) => { stats.colors++; return `${a}${q}light${q}`; });

  // inline style objects: fontFamily: "'Syne', sans-serif"  (any quote style)
  out = out.replace(/fontFamily\s*:\s*(["'`])((?:(?!\1)[\s\S])*?(Syne|JetBrains)(?:(?!\1)[\s\S])*?)\1/g, (_m, _q, _body, name) => {
    stats.fonts++;
    return `fontFamily: "${name === "JetBrains" ? MONO_FONT : UI_FONT}"`;
  });
  return out;
}

let changed = 0;
const SKIP = new Set([path.join(SRC, "app", "globals.css")]);
for (const file of walk(SRC)) {
  if (SKIP.has(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const stats = { imports: 0, blocks: 0, kept: 0, fonts: 0, colors: 0 };
  const next = transformFile(file, text, stats);
  if (next === text) continue;
  changed++;
  console.log(`${DRY ? "[dry] " : ""}${path.relative(ROOT, file)}  ` +
    `font-imports:${stats.imports} theme-blocks:${stats.blocks}${stats.kept ? ` (kept ${stats.kept} custom vars)` : ""} fonts:${stats.fonts} colours:${stats.colors}`);
  if (!DRY) {
    const dest = path.join(BACKUP, path.relative(ROOT, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    fs.writeFileSync(file, next);
  }
}
console.log(changed ? `\n${DRY ? "Would change" : "Changed"} ${changed} file(s).${DRY ? "" : " Originals saved in .theme-backup/ (copy back to undo)."}`
                    : "\nNothing to change — no old theme found in src/.");
