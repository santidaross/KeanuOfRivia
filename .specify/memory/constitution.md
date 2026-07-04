<!--
SYNC IMPACT REPORT
==================
Ratificación inicial 1.0.0 (2026-07-04): primera constitución de KeanuOfRivia Website.

Principios definidos (8):
  I.    Spec-Driven Development (NON-NEGOTIABLE)
  II.   Test-First / TDD (NON-NEGOTIABLE)
  III.  Secrets & Configuration Hygiene (NON-NEGOTIABLE)
  IV.   Edge-First & Type Safety
  V.    Security Headers & Input Discipline
  VI.   KV Data Discipline
  VII.  Theming Isolation
  VIII. Conventional Commits & No AI Attribution

Templates status:
  ✅ .specify/templates/plan-template.md — referencia genérica a la constitución; sin cambios
  ✅ .specify/templates/spec-template.md — genérico; sin cambios
  ✅ .specify/templates/tasks-template.md — categorías cubren testing/seguridad; sin cambios
  ✅ CLAUDE.md — sección de fundamentos alineada con estos principios

Follow-up TODOs: none. RATIFICATION_DATE = fecha de autoría (2026-07-04).
-->

# KeanuOfRivia Website — Constitución

KeanuOfRivia Website es un sitio personal servido como **Cloudflare Worker** (`src/index.js`):
una landing de enlaces (Minecraft, Steam, Buy Me A Coffee) con estado en vivo del server de
Minecraft y una API de administración protegida, todo respaldado por Cloudflare KV. Esta
constitución define los principios NO negociables que gobiernan el desarrollo. Supersede cualquier
práctica ad-hoc; todo plan e implementación se valida contra este documento.

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

Sin un `spec.md` aprobado y commiteado no se escribe código de feature. Todo trabajo sigue el
ciclo Planner → Execute → Verify: `specify → clarify → checklist → plan → tasks → analyze →
implement`, seguido del gate **VERIFY & POLISH** por feature completa. Las specs son documentos
vivos: si la implementación revela una desviación, se ACTUALIZA la spec — `analyze` garantiza que
spec y código no diverjan.

**Rationale**: La spec es la fuente de verdad del QUÉ. Codear sin spec genera deuda, retrabajo y
pérdida de trazabilidad, incluso en un proyecto chico.

### II. Test-First / TDD (NON-NEGOTIABLE)

Los tests se escriben ANTES de la implementación (Red → Green → Refactor). El runtime de test es
**Vitest con `@cloudflare/vitest-pool-workers`**, que ejecuta los tests dentro de `workerd` (el
mismo runtime que producción) con acceso a los bindings reales (KV). La lógica de los handlers
(`site-config`, `mc/status`, `admin/config`) se testea contra el Worker real, no contra mocks del
runtime. Las APIs externas (mcstatus.io) se mockean — jamás llamadas reales en tests.

**Rationale**: Testear en `workerd` evita el falso verde de correr en Node y romper en el edge.
Tests primero fuerzan diseño verificable y previenen regresiones al deployar a staging/prod.

### III. Secrets & Configuration Hygiene (NON-NEGOTIABLE)

NINGÚN secreto vive en el repositorio. `ADMIN_API_KEY` y cualquier credencial se gestionan como
**Wrangler secrets** (`wrangler secret put`), NUNCA en `[vars]` de `wrangler.toml` ni como fallback
hardcodeado en el código. `wrangler.toml` solo contiene configuración no sensible (bindings,
routes, vars públicas de entorno). Un secreto que llegó al repo se considera COMPROMETIDO y se
ROTA, además de purgarse. `.dev.vars` (secrets locales) va siempre en `.gitignore`.

**Rationale**: El repo va a ser público. Una key filtrada en el historial da acceso admin a
cualquiera; borrarla en un commit nuevo no alcanza — hay que rotarla y sacarla de la historia.

### IV. Edge-First & Type Safety

El código corre en el edge (V8 isolates, no Node): se usan APIs Web estándar (`fetch`, `Request`,
`Response`, `URL`, Web Crypto), nunca APIs de Node que el runtime no soporta. El TypeScript que
exista (config, tipos, tests) corre en modo `strict`; prohibido `any` y el non-null assertion
(`!`) sin justificación documentada. Las variables de entorno se leen del `env` del Worker, nunca
de un `process.env` global.

**Rationale**: El edge tiene un runtime acotado; asumir Node rompe en deploy. `strict` detecta
errores en build, no en producción.

### V. Security Headers & Input Discipline

Toda respuesta lleva los security headers definidos una sola vez (`securityHeaders`): CSP,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. La CSP
`connect-src` se mantiene mínima (solo los orígenes realmente usados, ej. `api.mcstatus.io`). Los
endpoints que mutan estado (`POST/DELETE /api/admin/config`) exigen auth por bearer token
constante-time y validan el shape del input antes de persistir. El endpoint admin nunca se cachea.

**Rationale**: Es un sitio público expuesto a internet; los headers y la validación son la primera
línea de defensa y no deben depender de recordar setearlos por respuesta.

### VI. KV Data Discipline

Cloudflare KV es el único almacén. Todo valor escrito lleva un `expirationTtl` acorde a su
frescura (config del sitio horas; estado de Minecraft ~60s). Las lecturas toleran el cache miss y
degradan con un default sensato (nunca romper la página por un KV vacío o un fetch externo caído).
KV es eventualmente consistente: no se lo usa para nada que requiera lectura-tras-escritura
inmediata y fuerte.

**Rationale**: KV es rápido y global pero eventualmente consistente y con TTL; tratarlo como una DB
transaccional lleva a bugs sutiles. Degradar con defaults mantiene el sitio siempre servible.

### VII. Theming Isolation

La identidad visual (colores, radios, sombras, tipografía) vive en CSS custom properties en un solo
lugar; los componentes usan variables semánticas (`--bg-primary`, `--text-primary`, …), nunca hex
hardcodeados. El sitio soporta `auto`/`light`/`dark` vía `prefers-color-scheme`. Cambiar toda la
identidad debe ser posible desde ese bloque de tokens sin tocar la lógica.

**Rationale**: Aislar la identidad permite rebrandear en un solo lugar sin regresiones.

### VIII. Conventional Commits & No AI Attribution

Los commits siguen Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`,
`ci:`…). Está PROHIBIDA cualquier atribución de IA en los mensajes (`Co-Authored-By`, firmas de
herramientas, etc.) — lo valida un gate en `commit-msg`. Código en inglés; comentarios y docs en
español.

**Rationale**: Historial legible y parseable (habilita changelog/versionado automático) y política
del proyecto sobre autoría.

## Additional Constraints

**Stack**: Cloudflare Workers (`wrangler`), JavaScript/TypeScript, Cloudflare KV, deploy por
`wrangler deploy` con entornos `staging` y `production`. Local: `wrangler dev` (runtime `workerd`,
sin Docker). Testing: Vitest + `@cloudflare/vitest-pool-workers`. Sin framework de servidor
adicional; sin base de datos relacional.

**Disciplina de costos**: se opera dentro del free tier de Cloudflare Workers/KV. No se agregan
servicios de pago sin decisión consciente.

## Development Workflow & Quality Gates

**Ciclo por feature**: `specify → clarify → checklist → plan (Constitution Check gate) → tasks →
analyze → implement (TDD)`. La `checklist` valida la calidad de la spec ANTES de planear; `analyze`
valida la consistencia spec/plan/tasks ANTES de implementar.

**VERIFY & POLISH (por feature completa)**: (a) tests automáticos en verde (`vitest` en el pool de
Workers); (b) verificación hands-on contra `wrangler dev` (curl a los endpoints, revisar la página);
(c) si la feature toca UI: pulido con `impeccable` + Playwright (mobile 375px + desktop, estados,
a11y) y `feature-shots`; (d) sign-off. Recién entonces corre **DOCS-SYNC** (actualizar `/docs`,
CLAUDE.md y la constitución en el mismo PR que el código) y se cierra.

**Ramas**: `main` = producción (deployable siempre), `feature/NNN-*` efímeras que salen de `main` y
vuelven por PR. Deploy a `staging` para UAT antes de `production`.

## Governance

Esta constitución supersede cualquier otra práctica. Todo `/speckit-plan` debe pasar el
Constitution Check; las violaciones se documentan y justifican en Complexity Tracking o se rechazan.
`/speckit-analyze` verifica que spec, plan y tasks no violen estos principios.

**Enmiendas**: requieren (a) documentar la motivación, (b) incrementar la versión según SemVer, y
(c) propagar el impacto a los templates dependientes y a CLAUDE.md. Versionado: MAJOR para
remociones/redefiniciones incompatibles de principios, MINOR para principios o secciones
nuevas/expandidas, PATCH para clarificaciones no semánticas.

**Version**: 1.0.0 | **Ratified**: 2026-07-04 | **Last Amended**: 2026-07-04
