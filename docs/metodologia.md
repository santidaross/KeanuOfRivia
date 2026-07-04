# Metodología de desarrollo asistido por IA

Guía de la forma de trabajo de este repo con Claude Code: desarrollo **disciplinado, trazable y con
memoria de equipo**. Resuelve tres problemas del desarrollo asistido por IA:

| Problema | Solución |
|----------|----------|
| La IA genera código sin entender qué se necesita ("vibe coding") | **SDD (Spec-Driven Development)**: sin spec aprobado, no hay código |
| Cada sesión de IA arranca de cero, se pierden decisiones | **Engram**: memoria persistente entre sesiones |
| El trabajo se hace sin convenciones | **CLAUDE.md + Constitución**: contrato del proyecto que la IA respeta siempre |

**Idea fuerza**: la IA no es un autocompletador, es un miembro del equipo que sigue procesos,
documenta lo que hace y recuerda lo que aprendió.

---

## Los tres pilares

```
┌─────────────────┬───────────────┬───────────────┐
│   SPEC-KIT      │    ENGRAM     │   CLAUDE.md   │
│   (proceso)     │   (memoria)   │  (contrato)   │
│ Specs antes     │ Decisiones y  │ Convenciones, │
│ que código.     │ aprendizajes  │ stack, reglas.│
│ Plan → Tasks →  │ persisten     │ La IA lo lee  │
│ Implement.      │ entre sesiones│ siempre.      │
└─────────────────┴───────────────┴───────────────┘
   + MCP Servers (GitHub, context7, Cloudflare docs, Playwright)
   + Agentes especializados (repo-coordinator, code-reviewer, test-runner, verify-qa)
   + Hooks de calidad (docs-drift, anti-slop, feature-shots, engram-recall)
```

### Pilar 1 — Spec-Kit (SDD)
Todo feature nace como una especificación escrita, revisada y commiteada antes de tocar código.
Genera artefactos versionados en `specs/NNN-nombre/` (`spec.md`, `plan.md`, `tasks.md`).

### Pilar 2 — Engram
Memoria persistente. Cada decisión técnica, bug corregido (con causa raíz) y convención se guarda.
Lo que aprende una sesión lo recuerda la siguiente.

### Pilar 3 — CLAUDE.md + Constitución
- **CLAUDE.md**: lo que Claude Code lee al iniciar. Stack, estructura, convenciones, ciclo de trabajo.
- **Constitución** (`.specify/memory/constitution.md`): principios no negociables. Actúa como *gate*:
  ningún plan técnico pasa si viola la constitución.

---

## El ciclo: Planner → Execute → Verify

**Regla de oro: sin spec aprobado, no hay implementación.**

| Paso | Comando | Qué genera |
|------|---------|-----------|
| 1. Especificar | `/speckit-specify` + descripción | `specs/NNN-nombre/spec.md` — **qué** construir |
| 2. Aclarar | `/speckit-clarify` | Preguntas dirigidas; respuestas quedan en el spec |
| 3. Checklist | `/speckit-checklist` | Valida la calidad de la spec antes de planear |
| 4. Plan técnico | `/speckit-plan` | `specs/NNN-nombre/plan.md`. GATE: Constitution Check |
| 5. Tareas | `/speckit-tasks` | `specs/NNN-nombre/tasks.md` — ordenadas por dependencias |
| 6. Analizar | `/speckit-analyze` | Consistencia spec/plan/tasks antes de implementar |
| 7. Implementar | `/speckit-implement` | Código, tarea por tarea (TDD), guardando en Engram |
| 8. Docs-sync | `/docs-sync` | Sincroniza docs/CLAUDE.md/constitución antes de cerrar |

Skills complementarias: `/speckit-constitution` (principios, una vez al inicio),
`/speckit-git-feature` (rama `feature/NNN-*`), `/speckit-git-commit` (auto-commit).

---

## Engram en el día a día

Se guarda automáticamente: decisiones técnicas/arquitectónicas, bugs con causa raíz, convenciones, y
confirmaciones/rechazos del usuario. En conversación, preguntá *"¿qué decidimos sobre X?"* o
*"¿ya resolvimos este bug?"* — la IA busca en Engram. Al cerrar sesión llama a `mem_session_summary`.

---

## MCP Servers

| MCP | Para qué |
|-----|----------|
| **GitHub** | Repos, PRs, issues, Actions |
| **context7** | Docs actualizadas de librerías (evita APIs desactualizadas) |
| **Cloudflare docs** | Documentación de Workers, KV, wrangler |
| **Playwright** | Browser para E2E + validación visual de UI |

Variables de entorno necesarias (en el entorno de la sesión / secrets de CI, **nunca commitear**):

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=    # MCP GitHub + CI/CD
```

---

## Agentes especializados

| Agente | Modelo | Cuándo usarlo |
|--------|--------|--------------|
| repo-coordinator | Opus | CI/CD, config de plataforma, promoción a staging/prod, releases |
| code-reviewer | Sonnet | Revisar diffs (correctitud + reuso/simplificación) |
| test-runner | Sonnet | Correr la suite (Vitest en el pool de Workers) en paralelo |
| verify-qa | Sonnet | Verificar comportamiento real contra `wrangler dev` |

---

## Hooks de calidad (avisan, no bloquean)

- **`engram-recall`** (UserPromptSubmit): recupera memoria relevante cuando el prompt pide contexto.
- **`docs-drift`** (PreToolUse): avisa si un commit/PR toca código sin tocar documentación.
- **`impeccable-slop`** (PreToolUse): detecta AI-slop en UI (.tsx/.css) al commitear/abrir PR.
- **`feature-shots-drift`** (PreToolUse): recuerda guardar la matriz de screenshots de la feature.

Además, gates duros en git (lefthook): `commit-msg` valida Conventional Commits y **bloquea atribución
de IA**; `pre-commit` corre typecheck, anti-slop y regenera el índice de specs.

---

## Reglas de oro

1. **Sin spec, no hay código.** Arrancar con `/speckit-specify`.
2. **Constitución primero.** `/speckit-constitution` al inicio (ya ratificada v1.0.0).
3. **Una rama por feature.** `feature/NNN-*` desde `main`, conventional commits.
4. **Nunca commitear secretos.** `ADMIN_API_KEY` por `wrangler secret`; local en `.dev.vars`.
5. **Cerrar sesión con resumen.** `mem_session_summary` antes del "listo".
