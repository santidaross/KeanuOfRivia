---
name: "speckit-docs-sync"
description: "Sincroniza TODA la documentación afectada por un cambio de código (DOCS-SYNC, gate de Definition of Done): /docs, ADRs, CLAUDE.md, constitución, specs (back-sync de Clarifications), .env.example, OpenAPI/Scalar, roadmap y memoria — en el mismo PR que el código."
argument-hint: "[feature o rama; por defecto la rama actual vs main]"
compatibility: "Requiere estructura spec-kit con directorio .specify/"
metadata:
  author: "prode"
  source: "DOCS-SYNC gate (CLAUDE.md + constitución)"
user-invocable: true
disable-model-invocation: false
---

# DOCS-SYNC — sincronizar documentación con el código

Gate de **Definition of Done**: después de VERIFY & POLISH (tests verdes + QA + sign-off), y antes
de cerrar/mergear, la documentación afectada se actualiza **en el mismo PR que el código** (docs-as-code,
para que no se desincronice). Este skill recorre cada superficie de doc, decide si el cambio la afecta y
la actualiza. Es el complemento del hook `docs-drift.sh` (que solo **avisa**; este **hace**).

## Cuándo correrlo

- Al cerrar una feature (tras el checklist y cualquier refactor posterior — recién ahí la implementación
  es estable).
- Cuando el hook de drift avisa que tocaste código sin tocar doc.
- Antes de `gh pr create` (o al actualizar un PR abierto con cambios de comportamiento/config).

## Procedimiento

### 1. Determinar el alcance del cambio

Calcular qué cambió en la rama (no asumir): `git diff --name-only main...HEAD` + el working tree.
Resumir en una frase **qué cambió de comportamiento, contrato o configuración** (no el detalle de
implementación). Identificar a qué **feature(s)** (`specs/NNN-*`) pertenece. Si nada cambió de
comportamiento/contrato/config (solo refactor interno o tests), **decirlo y terminar** — DOCS-SYNC no
inventa cambios.

### 2. Recorrer cada superficie (decidir afecta / N/A y actualizar)

Para cada una: **(a)** ¿este cambio la afecta? **(b)** si sí, actualizarla; si no, marcar N/A con motivo.

| Superficie | Actualizar cuando… |
|---|---|
| `specs/<feature>/spec.md` | el comportamiento real difiere o extiende el spec → agregar `### Session YYYY-MM-DD` bajo `## Clarifications` **y** reflejarlo en el/los FR o Key Entity afectado (sin dejar contradicciones; reemplazar lo que quedó inválido). |
| `.env.example` (raíz y `apps/web/.env.example`) | se agregó/renombró/eliminó una variable de entorno → fila con comentario y default. |
| `CLAUDE.md` | cambió el stack, el workflow, un MCP, un skill activo, o una regla de negocio configurable (sección "Variables de entorno"/"Reglas de negocio configurables"). |
| `docs/adr/NNNN-*.md` (+ `docs/adr/README.md`) | se tomó una **decisión arquitectónica** (elección con trade-offs, patrón nuevo, cambio de enfoque) → ADR nuevo numerado + entrada en el índice. |
| `.specify/memory/constitution.md` | cambió un **principio** o una regla de gobernanza (raro; bump de versión según corresponda). |
| `docs/*` (`setup.md`, `dev-mode.md`, `migrations.md`, `mcp-usage.md`, `conventions.md`) | cambió el setup local, el flujo de dev, migraciones, uso de MCP o una convención. |
| `docs/roadmap.md` | cambió el estado/alcance de una feature o MVP. |
| `apps/web/src/lib/changelog.ts` (Novedades, 056) | la feature aporta algo **visible al usuario** → agregar una entrada de release (versión/fecha/título/items) en **lenguaje al público** (qué gana el usuario, NUNCA técnico/estilo commit); marcar `destacada: true` solo si amerita el modal. |
| OpenAPI / Scalar (`/api/docs`) | cambió un endpoint o un schema Zod en `packages/schemas` → verificar que el spec autogenerado lo refleje (normalmente automático; solo validar). |
| Memoria / Engram (`mem_save`) | se tomó una decisión, se fijó una convención o se descubrió un gotcha no obvio → persistir con su "Why" y "How to apply". |

### 3. Reglas

- **Mismo PR que el código**: los cambios de doc se commitean en la rama de la feature, no aparte.
- **No inventar**: si una superficie no aplica, marcarla N/A con el motivo — no agregar ruido.
- **Specs**: respetar la convención de spec-kit (bullet bajo `## Clarifications` + actualizar el FR/Entity;
  los únicos headings nuevos permitidos son `## Clarifications` y `### Session YYYY-MM-DD`).
- **Idioma**: documentación en español (es-AR); código/identificadores en inglés.
- **Commits**: conventional commits (`docs: ...`); sin atribución de IA.

### 4. Reporte

Cerrar con una tabla: por cada superficie → **Actualizada** (qué) / **N/A** (motivo) / **Pendiente**
(qué falta y por qué). Si quedó algo pendiente que necesita decisión del usuario, señalarlo explícito.

## Done When

- [ ] Alcance del cambio resumido (comportamiento/contrato/config) y feature(s) identificada(s)
- [ ] Cada superficie evaluada (actualizada o N/A con motivo)
- [ ] Cambios de doc commiteados en la misma rama/PR que el código
- [ ] Reporte final entregado (actualizada / N/A / pendiente)
