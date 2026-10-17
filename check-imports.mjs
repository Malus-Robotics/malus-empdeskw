// check-imports.mjs   — run from the project root:  node check-imports.mjs
// Finds imports whose file name differs only in UPPER/lower case from the real
// file (or that don't exist). macOS ignores case, so these work on your laptop
// and then fail on Vercel, which runs Linux:
//   "Cannot find module '@/models/Notification'"
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
if (!fs.existsSync(SRC)) { console.error("Run this from the project root (the folder with src/)."); process.exit(1); }

const EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", ".d.ts"];
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(tsx?|jsx?|mjs)$/.test(e.name) && out.push(p);
  }
  return out;
};

// resolve `target` segment by segment against the REAL names on disk
function resolveExact(target) {
  const parts = path.relative(path.parse(target).root, target).split(path.sep);
  let cur = path.parse(target).root, caseFix = false;
  for (const seg of parts) {
    const names = fs.existsSync(cur) ? fs.readdirSync(cur) : [];
    if (names.includes(seg)) { cur = path.join(cur, seg); continue; }
    const alt = names.find((n) => n.toLowerCase() === seg.toLowerCase());
    if (!alt) return { ok: false };
    cur = path.join(cur, alt); caseFix = true;
  }
  return { ok: true, real: cur, caseFix };
}

function check(base, spec) {
  for (const ext of EXT) {
    const r = resolveExact(base + ext);
    if (r.ok && fs.statSync(r.real).isFile()) return r;
  }
  for (const idx of ["index.ts", "index.tsx", "index.js"]) {
    const r = resolveExact(path.join(base, idx));
    if (r.ok) return r;
  }
  return { ok: false };
}

let bad = 0;
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/g)) {
    const spec = m[1];
    const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const r = check(base, spec);
    const rel = path.relative(process.cwd(), file);
    if (!r.ok) { bad++; console.log(`MISSING     ${rel}\n            imports "${spec}" — no such file`); }
    else if (r.caseFix) { bad++; console.log(`WRONG CASE  ${rel}\n            imports "${spec}"\n            real file: ${path.relative(process.cwd(), r.real)}`); }
  }
}
console.log(bad ? `\n${bad} problem(s). Fix the import or rename the file so the case matches exactly.` : "All imports resolve with exact case.");
process.exit(bad ? 1 : 0);
