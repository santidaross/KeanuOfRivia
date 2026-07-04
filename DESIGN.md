# DESIGN.md — KeanuOfRivia Website

Fuente de la identidad visual. Los comandos de `impeccable` la leen antes de trabajar. Los tokens
reales viven en el CSS inline de `src/index.js` (`:root` + `@media (prefers-color-scheme: dark)`);
este documento es la referencia semántica.

## Personalidad
Landing personal, limpia y sobria. Una tarjeta central con avatar, nombre, descripción y una lista
de botones-enlace. Sin ruido decorativo. Mobile-first.

## Color (ver `.impeccable/design.json`)
- **Primario**: azul `#3b82f6` (violeta `#8b5cf6` como acento; el avatar es un gradiente azul→violeta).
- **Neutrales**: texto `#1a202c` / fondo `#ffffff` en claro; se invierten en oscuro.
- **Estado**: online `#10b981`, offline `#ef4444` (indicador del server de Minecraft).
- **Tema**: `auto` / `light` / `dark` vía `prefers-color-scheme`. Nunca hex hardcodeados en la lógica:
  usar las CSS custom properties (`--bg-primary`, `--text-primary`, `--border`, `--shadow`).

## Tipografía
System font stack (`-apple-system, Segoe UI, Roboto…`). Escala: h1 2.5rem/700, descripción 1.125rem,
labels/estado 0.875rem.

## Layout
- Contenedor centrado, `max-width: 800px`, todo vertical y centrado.
- Botones-enlace: tarjeta con borde, radio 12px, hover con leve `translateY(-2px)` + sombra.
- Avatar circular 120px (100px en mobile ≤640px).

## Interacción
- Hover sutil en botones (elevación + color de borde). Sin animaciones agresivas.
- Estado del server con punto de color + texto ("Online (x/y jugadores)" / "Offline").
