#!/usr/bin/env node
// Gate anti-slop: corre el detector de anti-patterns de impeccable y FALLA si encuentra alguno.
// El detector (`.claude/skills/impeccable/scripts/detect.mjs`) solo REPORTA (sale 0 igual), así que
// este wrapper parsea su salida `--json` y decide el exit code.
//
// Uso:
//   node scripts/check-slop.mjs <archivo.tsx> [...]   → chequea esos archivos (pre-commit: staged)
//   node scripts/check-slop.mjs --all                 → escanea toda la UI de src/ (CI)
//
// Política: el baseline del repo está limpio (0 findings), así que se falla ante CUALQUIER finding.
// Falso positivo puntual: saltear ese commit con `git commit --no-verify` (CI igual reescanea --all).

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const DETECTOR = join(repoRoot, ".claude", "skills", "impeccable", "scripts", "detect.mjs");
const UI_EXTS = new Set([".tsx", ".jsx", ".css"]);
const UI_ROOT = join(repoRoot, "src");

/** Recorre un directorio juntando archivos de UI (.tsx/.jsx/.css). */
function walkUi(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...walkUi(full));
    } else if (UI_EXTS.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function resolveTargets(argv) {
  if (argv.includes("--all")) return walkUi(UI_ROOT);
  return argv
    .filter((a) => !a.startsWith("--"))
    .filter((a) => UI_EXTS.has(extname(a)))
    .filter((a) => existsSync(a) && statSync(a).isFile());
}

// Si el skill no está presente (contributor sin impeccable), no bloquear: avisar y pasar.
if (!existsSync(DETECTOR)) {
  console.warn("⚠ detector de impeccable no encontrado — se saltea el gate anti-slop.");
  process.exit(0);
}

const targets = resolveTargets(process.argv.slice(2));
if (targets.length === 0) {
  process.exit(0); // nada de UI que chequear
}

const res = spawnSync("node", [DETECTOR, "--json", ...targets], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

let findings;
try {
  findings = JSON.parse(res.stdout || "[]");
} catch {
  // Falla del detector (no JSON): no bloquear el commit por una herramienta rota; avisar.
  console.warn("⚠ el detector de impeccable no devolvió JSON válido — se saltea el gate.");
  if (res.stderr) console.warn(res.stderr.trim());
  process.exit(0);
}

if (!Array.isArray(findings) || findings.length === 0) {
  console.log(`✔ anti-slop: ${targets.length} archivo(s) de UI sin anti-patterns.`);
  process.exit(0);
}

// Hay findings → reportar agrupado por archivo y fallar.
const byFile = new Map();
for (const f of findings) {
  const list = byFile.get(f.file) ?? [];
  list.push(f);
  byFile.set(f.file, list);
}

console.error(`\n✖ anti-slop: ${findings.length} anti-pattern(s) detectado(s) por impeccable:\n`);
for (const [file, list] of byFile) {
  console.error(`  ${relative(repoRoot, file)}`);
  for (const f of list) {
    console.error(`    L${f.line} [${f.severity}] ${f.antipattern}: ${f.description}`);
  }
}
console.error(
  `\nCorregí los anti-patterns (o usá \`/impeccable\` para refinar). ` +
    `Falso positivo puntual: \`git commit --no-verify\` (CI igual reescanea).\n`,
);
process.exit(1);
