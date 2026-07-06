# CLAUDE.md — KeanuOfRivia Website

Este archivo guía a Claude Code cuando trabaja en este proyecto. Leelo completamente antes de empezar cualquier tarea.

---

## Qué es este proyecto

**KeanuOfRivia Website** — sitio personal servido como **Cloudflare Worker**. Es una landing de
enlaces (Minecraft, Steam, Buy Me A Coffee) que muestra el estado en vivo del server de Minecraft y
expone una API de administración protegida para editar la configuración del sitio. Todo el estado
vive en **Cloudflare KV**.

**Stack**:
- **Runtime**: Cloudflare Workers (V8 isolates / `workerd`) — NO Node. Se usan Web APIs estándar
  (`fetch`, `Request`/`Response`, `URL`, Web Crypto).
- **Entrypoint**: `src/index.js` (`export default { fetch }`) — rutea la API y sirve el sitio estático
  de `public/` vía el binding `env.ASSETS` (`[assets]` en `wrangler.toml`). JS puro, sin build.
- **Almacenamiento**: Cloudflare KV (binding `CACHE`) — config del sitio, estado de Minecraft y
  rate-limiting, con TTL.
- **Tooling**: `wrangler` (dev, deploy, secrets, tail) + **pnpm** (con hardening supply-chain — ver `pnpm-workspace.yaml` y `.npmrc`).
- **Testing**: Vitest + `@cloudflare/vitest-pool-workers` (corre dentro de `workerd`).
- **Deploy**: `wrangler deploy` con entornos `staging` y `production`.

**Endpoints**:
- `GET /api/site-config` — configuración del sitio (título, descripción, links), cacheada en KV.
- `GET /api/mc/status` — estado del server de Minecraft (proxy a mcstatus.io, cache ~60s, degrada a offline).
- `GET/POST/DELETE /api/admin/config` — CRUD de la config, protegido por `Authorization: Bearer <ADMIN_API_KEY>`.
- Cualquier otra ruta → la página HTML.

Este proyecto usa una **metodología de desarrollo asistido por IA**: SDD con spec-kit, memoria
persistente con Engram, hooks de calidad y agentes especializados. Ver [`docs/metodologia.md`](./docs/metodologia.md).

---

## Ciclo de trabajo: Planner → Execute → Verify

Todo trabajo sigue este ciclo. **Sin spec aprobado, no hay implementación.**

```
1. PLANNER         →  /speckit-specify → /speckit-clarify → /speckit-checklist → /speckit-plan → /speckit-tasks → /speckit-analyze
                      (features con UI: + /impeccable shape tras /speckit-plan — define UX/estados ANTES de codear)
2. EXECUTE         →  /speckit-implement  (tarea por tarea, TDD)
3. VERIFY & POLISH →  (por feature COMPLETA, EN ORDEN) tests verdes → verificación hands-on (wrangler dev)
                      → pulido de UI (/impeccable + Playwright + axe/viewport) → /feature-shots → sign-off
4. DOCS            →  DOCS-SYNC (actualizar /docs + CLAUDE.md + constitución)  →  cierre  →  merge a main
```

> **MODO SDD AUTOMÁTICO (default)**: las etapas de PLANIFICACIÓN (`specify → clarify → checklist →
> plan → tasks → analyze`) se ejecutan **de corrido, sin pedir validación entre etapas**. Solo se
> frena cuando (1) una clarificación GENUINAMENTE requiere al usuario (decisión sin default sensato),
> o (2) se llega a `/speckit-implement`, donde se presenta plan+tasks y se pide luz verde **una sola
> vez** antes de escribir código. Dada la luz verde, se implementan TODAS las tareas de corrido
> (implement + verify + docs), commiteando por chunk, sin volver a frenar salvo blocker real.

**Regla**: Antes de escribir código de feature, debe existir `specs/[NNN-feature]/spec.md` commiteado.

---

## SDD Workflow — paso a paso

```bash
# 1. Describir el feature en lenguaje natural → /speckit-specify → specs/NNN-nombre/spec.md
# 2. Si hay ambigüedades                     → /speckit-clarify
# 3. Validar calidad de la spec              → /speckit-checklist
# 4. Plan técnico (GATE: Constitution Check) → /speckit-plan → specs/NNN-nombre/plan.md
# 5. Lista de tareas                         → /speckit-tasks → specs/NNN-nombre/tasks.md
# 6. Consistencia spec/plan/tasks            → /speckit-analyze
# 7. Implementar (TDD, tarea por tarea)      → /speckit-implement
# 8. DOCS-SYNC antes de cerrar               → /docs-sync
```

Estructura que genera:

```
specs/
└── NNN-nombre-feature/
    ├── spec.md      → qué construir
    ├── plan.md      → cómo construirlo
    └── tasks.md     → lista de tareas
```

---

## Fundamentos técnicos no negociables

Ver la constitución completa en [`.specify/memory/constitution.md`](./.specify/memory/constitution.md). Resumen operativo:

### Secretos (regla dura)
- **NINGÚN secreto en el repo.** `ADMIN_API_KEY` y credenciales van por `wrangler secret put`, NUNCA en
  `[vars]` de `wrangler.toml` ni hardcodeadas en el código.
- En local, los secretos van en `.dev.vars` (gitignoreado), no en `wrangler.toml`.
- Un secreto que llegó al repo se considera COMPROMETIDO: se ROTA y se purga.

### Runtime edge
- Es `workerd`, no Node: nada de `fs`, `path`, `process` (salvo lo que Workers polyfillea), ni librerías
  Node-only. Usar Web APIs. Las env/secrets se leen del `env` del Worker, no de `process.env` global.

### Seguridad
- Toda respuesta lleva `securityHeaders` (CSP, X-Frame-Options, HSTS, etc.). CSP `connect-src` mínima.
- El endpoint admin valida el bearer y el shape del input antes de persistir; nunca se cachea.

### KV
- Escrituras con `expirationTtl`. Lecturas que toleran cache miss y degradan con un default sensato
  (nunca romper la página por KV vacío o un fetch externo caído). KV es eventualmente consistente.

### TypeScript (donde aplique)
- `strict`. Prohibido `any` y `!` sin justificación.

### Testing
- TDD (Red → Green → Refactor). Vitest + `@cloudflare/vitest-pool-workers` (corre en `workerd`).
- APIs externas (mcstatus.io) mockeadas — nunca red real en tests. Ver skill `testing-workers-vitest`.

### Theming
- Identidad visual en CSS custom properties, un solo lugar. Sin hex hardcodeados. Soporta `auto`/`light`/`dark`.

---

## Engram — memoria persistente

Engram DEBE estar activo. **Guardar siempre** con `mem_save` cuando: se toma una decisión técnica/arquitectónica,
se corrige un bug (con causa raíz), se establece una convención, o el usuario confirma/rechaza una propuesta.
**Al cerrar cada sesión**: llamar `mem_session_summary`.

---

## MCP Servers configurados

Definidos en `.mcp.json` (project scope, versionado; `.claude/settings.json` los auto-aprueba):

| MCP | Para qué |
|-----|----------|
| **GitHub** | Repos, PRs, issues, Actions |
| **context7** | Docs actualizadas de librerías (Workers, wrangler, Vitest) |
| **cloudflare-docs** | Documentación de Cloudflare (Workers, KV, wrangler) |
| **Playwright** | Automatización de browser para E2E + validación visual de UI |

---

## Estructura del proyecto

```
KeanuOfRivia-Website/
├── src/
│   └── index.js         ← Worker: ruteo + handlers de API + rate-limiting (sirve public/ vía env.ASSETS)
├── public/              ← sitio estático (index.html, css/, fonts/, images/) servido por el Worker
├── specs/               ← Generado por spec-kit (features SDD)
├── scripts/             ← gates de calidad (check-commit-msg, check-slop, gen-specs-index)
├── skills/              ← skills de best practices (uiux-*)
├── .claude/             ← config de Claude Code (agents, hooks, skills, settings)
├── .specify/            ← config y motor de spec-kit (templates, scripts, constitución)
├── .github/             ← issue/PR templates + CI (wrangler)
├── wrangler.toml        ← config del Worker (SIN secretos)
├── .dev.vars           ← secretos LOCALES (nunca commitear)
└── CLAUDE.md
```

---

## Entornos y deploy

```
production → wrangler deploy --env production   (sitio público)
staging    → wrangler deploy --env staging      (UAT antes de prod)
local      → wrangler dev                        (workerd local, http://localhost:8787)
```

- **Ramas**: `main` = producción (siempre deployable); `feature/NNN-*` salen de `main` y vuelven por PR.
- **Gate**: `feature/* → main` (PR) → deploy a **staging** → verificación → deploy a **production**. No se
  promueve a prod algo no validado en staging (salvo hotfix declarado y reversible). Lo gestiona el
  agente `repo-coordinator`.
- **Secretos por entorno**: `wrangler secret put ADMIN_API_KEY --env staging|production`.

---

## Desarrollo local

```bash
pnpm install                 # instala deps + lefthook (git hooks) via "prepare"
# Crear .dev.vars con los secretos locales (NO commitear):
#   ADMIN_API_KEY=una-key-de-desarrollo
pnpm dev                 # wrangler dev → http://localhost:8787 (workerd + assets de public/ + KV local)
pnpm test                # vitest en el pool de Workers
pnpm deploy:staging      # deploy a staging
```

> **No hace falta Docker**: los Workers corren local nativamente con `wrangler dev` (`workerd`). El KV
> es local/simulado en dev. Los secretos locales van en `.dev.vars` (gitignoreado).

---

## Skills activos — carga automática por contexto

| Contexto | Skill a cargar |
|----------|---------------|
| Escribir/correr tests del Worker (Vitest + pool de Workers, TDD) | `testing-workers-vitest` |
| Cualquier componente/página/UI | `nextjs-mobile-first` |
| Diseño/UX: refinar UI, jerarquía, color, tipografía, anti-patterns | `impeccable` |
| Validar accesibilidad | `uiux-axe-core` |
| Validar responsive / breakpoints | `uiux-viewport-testing` |
| Testing E2E / flujos de usuario | `uiux-playwright` |
| Regresión visual | `uiux-pixelmatch` |
| VERIFY & POLISH: matriz de screenshots de la feature | `feature-shots` |

Cargá el skill ANTES de escribir código, no después.

---

## Convenciones del proyecto

- **Ramas**: `main` → producción; `feature/<NNN-name>` → desarrollo (sale de `main`, vuelve por PR).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…). **Prohibida la atribución de
  IA** (Co-Authored-By, firmas de herramientas) — lo valida el hook `commit-msg`.
- **Idioma**: inglés (código) + español (comentarios y docs).
- **Tests**: requeridos para la lógica de los handlers y los caminos de error.
- **Mobile-first**: los estilos base son mobile; escalan hacia arriba.
