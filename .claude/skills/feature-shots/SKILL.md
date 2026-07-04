---
name: feature-shots
description: Captura y guarda una matriz variada de screenshots de Playwright de la feature construida (mobile/desktop × claro/oscuro × estados) en specs/NNN/screenshots/. Paso OBLIGATORIO de VERIFY & POLISH; deja el registro visual + baseline de regresión.
---

# FEATURE-SHOTS — registro visual de la feature

Captura la **matriz de screenshots** de la feature **ya construida y pulida** con Playwright MCP y la
guarda versionada en `specs/NNN-<feature>/screenshots/`. Es el **paso obligatorio de VERIFY & POLISH**
(no salteable para features con UI): da respaldo visual para el sign-off, registro de la feature, y
baseline para la regresión visual (`uiux-pixelmatch`).

> No confundir con las **propuestas** (screenshots de comparación ANTES de construir, en `proposals/`).
> Esto es la feature **final**. El hook `feature-shots-drift.sh` avisa si se cierra una feature de UI sin
> estos screenshots (no bloquea); este skill los produce.

## Cuándo

- En **VERIFY & POLISH**, después de que la UI es funcional y está pulida (impeccable + a11y), **antes**
  del sign-off y de DOCS-SYNC. Siempre que la feature toque UI.

## Dónde corren (LOCAL) y el seed es prerrequisito (NO negociable)

- Los feature-shots se generan **SIEMPRE en LOCAL** contra el stack seedeado (`pnpm dev:all` + seed).
  **NO** se corren contra staging ni prod: staging es seed congelado y prod tiene datos reales; ninguno
  se usa para capturar la matriz.
- **ANTES de capturar DEBE existir seed local que cubra los ESTADOS de la feature** (vacío, con datos,
  cerrado/post-lock, error, y los flujos clave del `spec.md`). Sin seed que produzca un estado, ese
  estado no se puede capturar → **primero se prepara el seed, después se captura**.
- Si la feature introduce una **entidad/modalidad nueva** (p. ej. una modalidad CS2, un torneo, un tipo
  de notificación), el seed local (`apps/web/src/db/seed-staging.ts` o un seed por feature) **debe
  extenderse** para que sus pantallas rendericen con datos. Una feature con UI no está lista para
  feature-shots hasta que su estado está seedeado.
- Capturas reproducibles en lote: `apps/web/scripts/feature-shots.mjs` (login por magic-link/Mailpit,
  recorre rutas, matriz mobile/desktop × claro/oscuro). Requiere el stack local arriba + seed aplicado.

## Procedimiento

1. **Resolver superficies y estados** de la feature: las rutas/pantallas que introduce o cambia, y sus
   estados relevantes (vacío, con datos, error, y los flujos clave). Sacarlos del `spec.md`/`plan.md`
   (user stories + edge cases) o del diff de UI. **Preparar el seed local que produzca cada estado
   ANTES de capturar** (ver "el seed es prerrequisito" arriba) — incluido extender el seed si la feature
   trae una entidad/modalidad nueva. Sin seed que cubra el estado, no se captura.
2. **Levantar el stack** con datos (`pnpm dev:all`); si el entorno local está bloqueado, usar el preview
   de la rama. Confirmar que la superficie renderiza con datos reales (no estados rotos).
3. **Capturar la matriz** con Playwright MCP. Para CADA superficie/estado:
   - **Viewports**: mobile **375** (o 390) y **desktop** (~1280).
   - **Temas**: **claro** y **oscuro** (forzar dark con `document.documentElement.classList.add('dark')`
     vía `browser_evaluate`, y quitarlo para claro).
   - Esperar el render (datos cargados), luego `browser_take_screenshot`.
4. **Guardar** en `specs/NNN-<feature>/screenshots/` con convención:
   `<superficie>[-<estado>]-<mobile|desktop>-<light|dark>.png`
   (ej. `detalle-integrante-desktop-dark.png`, `detalle-vacio-mobile-light.png`). PNG; si pesan mucho,
   bajar resolución o usar JPEG.
5. **Verificar** cada imagen (leerla) — que muestre lo esperado, sin estados rotos ni el logo/fuente mal
   (artefactos de dev server stale). Re-capturar si algo se ve mal.
6. **Commitear** los screenshots **en el mismo PR que la feature** (docs-as-code; viajan con `specs/NNN/`).
7. Mostrarle al usuario las capturas (SendUserFile) como parte del sign-off.

## Reglas

- **Siempre claro + oscuro y mobile + desktop** (mínimo). Sumar los estados que la feature tenga.
- **Datos reales**, no placeholders rotos. Si una superficie está gateada (auth), entrar logueado.
- Versionadas en `specs/NNN/screenshots/` (no en `proposals/`, que es efímero).
- Idioma de nombres/commits en inglés-kebab para archivos; commit conventional (`docs`/`test` según
  corresponda), sin atribución de IA.

## Done When

- [ ] Superficies + estados de la feature identificados
- [ ] Matriz capturada (mobile + desktop × claro + oscuro × estados clave), verificada visualmente
- [ ] Guardada en `specs/NNN-<feature>/screenshots/` y commiteada con la feature
- [ ] Mostrada al usuario para el sign-off
