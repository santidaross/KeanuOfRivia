#!/usr/bin/env node
// Índice de specs: mantiene `specs/README.md` SIEMPRE en sync con las carpetas reales de `specs/`.
//
// `specs/NNN-slug/` es el archivo histórico (plano y secuencial, como exige spec-kit). Este script
// genera una TABLA navegable (NNN · título) entre los marcadores AUTO:INDEX, derivada de las carpetas
// `specs/NNN-*/` y el título de su `spec.md` (`# Feature Specification: <X>`).
//
// Modos:
//   - sin flags (CI): FALLA (exit 1) si `specs/README.md` quedó desactualizado.
//   - con `--fix` (pre-commit): reescribe el archivo (crea el header humano si no existe).
//
// La prosa de arriba del archivo es humana; el bloque entre marcadores es máquina. El hook de
// pre-commit corre `--fix` y re-stagea, así nunca hay que actualizarlo a mano.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS_DIR = join(repoRoot, "specs");
const README = join(SPECS_DIR, "README.md");
const START = "<!-- AUTO:INDEX:START — generado por scripts/gen-specs-index.mjs (no editar a mano) -->";
const END = "<!-- AUTO:INDEX:END -->";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8").replace(/\r\n/g, "\n") : "");

/** Carpetas `NNN-slug` (prefijo de 3 dígitos) ordenadas por NNN. */
function listSpecDirs() {
  if (!existsSync(SPECS_DIR)) return [];
  return readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{3}-/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

/** Título legible de una spec: `# Feature Specification: X` → `X`; fallback al slug capitalizado. */
function titleOf(slug) {
  const specMd = join(SPECS_DIR, slug, "spec.md");
  const content = read(specMd);
  const h1 = content.split("\n").find((l) => l.startsWith("# "));
  if (h1) {
    return h1
      .replace(/^#\s+/, "")
      .replace(/^Feature Specification:\s*/i, "")
      .trim();
  }
  return slug.replace(/^\d{3}-/, "").replace(/-/g, " ");
}

/** Tabla markdown del índice. */
function buildTable() {
  const dirs = listSpecDirs();
  const rows = dirs.map((slug) => {
    const num = slug.slice(0, 3);
    const title = titleOf(slug).replace(/\|/g, "\\|");
    return `| [\`${num}\` · ${title}](./${slug}/spec.md) |`;
  });
  const total = dirs.length;
  const lines = [
    `_${total} spec${total === 1 ? "" : "s"}._`,
    "",
    "| Spec |",
    "| --- |",
    ...rows,
  ];
  return lines.join("\n");
}

/** Header humano fijo (solo se usa si el archivo no existe todavía). */
function scaffold(block) {
  return [
    "# Índice de specs",
    "",
    "Registro histórico de las features (SDD con spec-kit). Cada `NNN-slug/` es el archivo inmutable de",
    "una feature: `spec.md` (qué), `plan.md` (cómo), `tasks.md` (lista). El número `NNN` es la identidad",
    "estable de la feature (rama `feature/NNN-…`). La carpeta es PLANA y secuencial porque spec-kit numera",
    "escaneando el primer nivel de `specs/`.",
    "",
    START,
    block,
    END,
    "",
  ].join("\n");
}

function compose(existing, block) {
  if (existing && existing.includes(START) && existing.includes(END)) {
    const head = existing.slice(0, existing.indexOf(START));
    const tail = existing.slice(existing.indexOf(END) + END.length);
    return `${head}${START}\n${block}\n${END}${tail}`;
  }
  return scaffold(block);
}

const fix = process.argv.includes("--fix");
const block = buildTable();
const existing = read(README);
const next = compose(existing, block);

if (existing === next) {
  process.exit(0);
}

if (fix) {
  writeFileSync(README, next, "utf8");
  console.log(`✔️  specs/README.md actualizado (${listSpecDirs().length} specs).`);
  process.exit(0);
}

console.error("❌ specs/README.md está desactualizado respecto a las carpetas de specs/.");
console.error("   Regenerá con: node scripts/gen-specs-index.mjs --fix");
process.exit(1);
