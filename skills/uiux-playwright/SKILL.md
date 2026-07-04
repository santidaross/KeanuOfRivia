---
name: uiux-playwright
description: Interaction testing and user flow validation with Playwright and MCP browser automation
version: 1.0.0
tags:
  - uiux
  - playwright
  - interaction
  - e2e
  - mcp
---

# uiux-playwright

Testing de interaccion, flujos de usuario y validacion funcional usando Playwright via MCP para automatizacion de navegador.

## Overview

Playwright MCP (`@playwright/mcp`) proporciona control directo del navegador desde el agente:
- Navegar a URLs y esperar carga completa
- Tomar screenshots de paginas y elementos
- Simular clicks, typing, scroll, hover, drag
- Inspeccionar DOM, accessibility tree y estilos computados
- Manejar dialogos, tabs y navegacion
- Redimensionar viewport para responsive testing
- Leer mensajes de consola y errores JavaScript

## Instalacion

```bash
# Instalar Playwright MCP server
npm install -g @playwright/mcp

# O ejecutar directamente con npx
npx @playwright/mcp@latest

# Instalar browsers (si no estan instalados)
npx playwright install chromium
```

## Configuracion MCP

### En `.opencode/opencode.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Opciones del servidor

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chromium",
        "--headless"
      ]
    }
  }
}
```

## Tools MCP Disponibles

### Navegacion

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `browser_navigate` | Navegar a una URL | `url` |
| `browser_go_back` | Navegar atras | - |
| `browser_go_forward` | Navegar adelante | - |
| `browser_wait` | Esperar milisegundos | `time` |

### Capturas

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `browser_screenshot` | Screenshot de la pagina | `raw?` (base64) |
| `browser_snapshot` | Accessibility tree snapshot | - |

### Interaccion

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `browser_click` | Click en elemento | `element`, `ref` |
| `browser_type` | Escribir texto | `element`, `ref`, `text`, `submit?` |
| `browser_hover` | Hover sobre elemento | `element`, `ref` |
| `browser_select_option` | Seleccionar opcion | `element`, `ref`, `values` |
| `browser_handle_dialog` | Aceptar/rechazar dialogo | `accept`, `promptText?` |
| `browser_drag` | Drag and drop | `startElement`, `startRef`, `endElement`, `endRef` |
| `browser_scroll` | Scroll en pagina | `direction` (`up`/`down`), `amount?` |
| `browser_press_key` | Presionar tecla | `key` |

### Tabs

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `browser_tab_list` | Listar tabs abiertas | - |
| `browser_tab_new` | Abrir nueva tab | `url?` |
| `browser_tab_select` | Cambiar a tab | `index` |
| `browser_tab_close` | Cerrar tab actual | - |

### Viewport y Consola

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `browser_resize` | Cambiar viewport | `width`, `height` |
| `browser_console_messages` | Leer consola | - |

## Workflows de Testing

### 1. Test de Navegacion Basica

```
# Verificar que todas las rutas principales cargan correctamente

PASO 1: Navegar a home
-> browser_navigate(url="http://localhost:4321/")
-> browser_snapshot()  # Verificar que carga

PASO 2: Verificar navegacion
-> browser_click(element="link", ref="nav-dashboard")  # Click en link de dashboard
-> browser_snapshot()  # Verificar que esta en /dashboard

PASO 3: Screenshot para evidencia
-> browser_screenshot()

PASO 4: Verificar consola limpia
-> browser_console_messages()  # No debe haber errores JS
```

### 2. Test de Formulario

```
# Testear login form end-to-end

PASO 1: Navegar al login
-> browser_navigate(url="http://localhost:4321/login")
-> browser_snapshot()

PASO 2: Testear validacion (submit vacio)
-> browser_click(element="button", ref="submit-btn")
-> browser_snapshot()  # Deben aparecer mensajes de error

PASO 3: Llenar email invalido
-> browser_type(element="input", ref="email-input", text="not-an-email")
-> browser_click(element="button", ref="submit-btn")
-> browser_snapshot()  # Error de formato de email

PASO 4: Llenar datos validos
-> browser_type(element="input", ref="email-input", text="test@example.com")
-> browser_type(element="input", ref="password-input", text="Password123!")
-> browser_click(element="button", ref="submit-btn")

PASO 5: Verificar redirect exitoso
-> browser_snapshot()  # Debe estar en /dashboard

PASO 6: Screenshot de evidencia
-> browser_screenshot()
```

### 3. Test de Interaccion Compleja

```
# Testear sidebar toggle, filtros y tabs

PASO 1: Setup
-> browser_navigate(url="http://localhost:4321/dashboard")
-> browser_resize(width=1440, height=900)

PASO 2: Toggle sidebar
-> browser_click(element="button", ref="sidebar-toggle")
-> browser_snapshot()  # Sidebar debe estar cerrado
-> browser_click(element="button", ref="sidebar-toggle")
-> browser_snapshot()  # Sidebar debe estar abierto

PASO 3: Filtros
-> browser_click(element="select", ref="status-filter")
-> browser_select_option(element="select", ref="status-filter", values=["active"])
-> browser_snapshot()  # Solo items activos visibles

PASO 4: Tabs
-> browser_click(element="tab", ref="settings-tab")
-> browser_snapshot()  # Panel de settings visible
-> browser_click(element="tab", ref="overview-tab")
-> browser_snapshot()  # Panel de overview visible

PASO 5: Keyboard navigation
-> browser_press_key(key="Tab")  # Mover foco
-> browser_press_key(key="Tab")
-> browser_press_key(key="Enter")  # Activar elemento enfocado
-> browser_snapshot()  # Verificar resultado
```

### 4. Test de Estados de UI

```
# Testear loading, error y empty states

PASO 1: Loading state
-> browser_navigate(url="http://localhost:4321/dashboard")
-> browser_screenshot()  # Capturar skeleton/spinner (rapido, antes de que cargue)

PASO 2: Empty state
-> browser_navigate(url="http://localhost:4321/dashboard?filter=nonexistent")
-> browser_snapshot()  # Debe mostrar "No results" o similar

PASO 3: Error state (si es testeable)
-> browser_navigate(url="http://localhost:4321/page-that-doesnt-exist")
-> browser_snapshot()  # Debe mostrar pagina 404

PASO 4: Success state
-> browser_navigate(url="http://localhost:4321/settings")
# ... hacer un cambio ...
-> browser_snapshot()  # Debe mostrar toast/message de exito
```

### 5. Test de Hover y Tooltips

```
# Testear estados hover y tooltips

PASO 1: Setup
-> browser_navigate(url="http://localhost:4321/dashboard")

PASO 2: Hover sobre boton
-> browser_hover(element="button", ref="action-btn")
-> browser_screenshot()  # Capturar hover state

PASO 3: Hover sobre icono con tooltip
-> browser_hover(element="icon", ref="info-icon")
-> browser_snapshot()  # Tooltip debe ser visible

PASO 4: Hover sobre link de navegacion
-> browser_hover(element="link", ref="nav-settings")
-> browser_screenshot()  # Hover state del link
```

## Patrones de Espera

### Esperar carga completa

```
# Despues de navegar, siempre verificar que la pagina cargo
-> browser_navigate(url="http://localhost:4321/dashboard")
-> browser_snapshot()  # Verificar que el contenido principal esta visible

# Si el contenido se carga asincronamente, esperar
-> browser_wait(time=2000)  # Esperar 2 segundos
-> browser_snapshot()  # Verificar de nuevo
```

### Esperar despues de interaccion

```
# Despues de click que dispara una accion asincrona
-> browser_click(element="button", ref="submit")
-> browser_wait(time=1000)  # Esperar respuesta del servidor
-> browser_snapshot()  # Verificar resultado
```

## Checklist de Interaccion por Componente

### Formularios

```
- [ ] Submit con campos vacios (validacion)
- [ ] Submit con datos invalidos (formato)
- [ ] Submit con datos validos (exito)
- [ ] Tab order correcto entre inputs
- [ ] Enter key submits form
- [ ] Error messages aparecen en el campo correcto
- [ ] Error messages desaparecen al corregir
- [ ] Loading state durante submit
- [ ] Success/error feedback despues de submit
- [ ] Autofill funciona correctamente
```

### Navegacion

```
- [ ] Todos los links navegan correctamente
- [ ] Back/forward del browser funcionan
- [ ] Active state en el link actual
- [ ] Breadcrumbs actualizados
- [ ] URL actualizada correctamente
- [ ] Deep linking funciona (navegar directo a URL)
```

### Modales/Dialogs

```
- [ ] Se abre correctamente
- [ ] Se cierra con X button
- [ ] Se cierra con click fuera (si aplica)
- [ ] Se cierra con Escape key
- [ ] Focus trap (tab no sale del modal)
- [ ] Scroll del body bloqueado cuando esta abierto
- [ ] Contenido detras del overlay no es clickeable
```

### Dropdowns/Selects

```
- [ ] Se abre al hacer click
- [ ] Se cierra al seleccionar opcion
- [ ] Se cierra al hacer click fuera
- [ ] Se cierra con Escape key
- [ ] Keyboard navigation (Arrow Up/Down)
- [ ] Search/filter funciona (si tiene)
- [ ] Opcion seleccionada se muestra correctamente
```

### Tablas

```
- [ ] Paginacion funciona
- [ ] Sort por columna funciona
- [ ] Filtros funcionan
- [ ] Seleccion de filas (si aplica)
- [ ] Acciones en fila funcionan (edit, delete)
- [ ] Empty state cuando no hay datos
- [ ] Loading state durante fetch
```

## Deteccion de Errores JavaScript

```
# Despues de cada flujo de interaccion, verificar errores en consola:
-> browser_console_messages()

# Errores comunes a buscar:
# - TypeError: Cannot read properties of undefined
# - Unhandled promise rejection
# - Failed to fetch (network errors)
# - CORS errors
# - 404 for assets (CSS, JS, images)
# - React/Vue warnings (development mode)
```

## Reporte de Resultados

### Formato para Beads

```bash
bd comments add task-id "[UI/UX Tester] Interaction Test Report:
Page: /dashboard
Browser: Chromium (headless)
Viewport: 1440x900

Test Results:
  ✅ Navigation: All links working (6/6)
  ✅ Sidebar toggle: Open/close correctly
  ✅ Filters: Status filter works
  ✅ Tabs: Switch between panels
  ❌ Keyboard: Tab order skips search input
  ✅ Form submit: Success flow works
  ✅ Error states: 404 page displays correctly
  ✅ Console: No JS errors

Total: 7/8 passing
Issue: Keyboard tab order needs fix (skips search input)"
```

### Formato de bug report

```bash
bd create "Interaction: Tab order skips search input in /dashboard" \
  -t bug -p 1 -l uiux,interaction,frontend,a11y \
  --assignee knowledge-4yh \
  -d "Playwright test: Pressing Tab from sidebar-toggle should focus search-input, but it skips to first-filter instead.
Expected tab order: sidebar-toggle -> search-input -> status-filter -> ...
Actual tab order: sidebar-toggle -> status-filter -> ...
Fix: Add proper tabindex to search input or restructure DOM order."
```

## Mejores Practicas

### DO

- Usar `browser_snapshot()` despues de cada accion para verificar el estado
- Verificar `browser_console_messages()` al final de cada flujo
- Testear keyboard navigation ademas de clicks
- Testear both happy path y error paths
- Esperar suficiente tiempo despues de acciones asincronas
- Tomar screenshots como evidencia de cada estado importante

### DON'T

- Depender de timers fijos — usar `browser_snapshot()` para verificar estado
- Olvidar testear el flujo de error (validacion, 404, network failure)
- Ignorar keyboard navigation y focus management
- Testear solo en un viewport — combinar con viewport testing
- Asumir que la pagina cargo — siempre verificar con snapshot

## Recursos

- [Playwright MCP GitHub](https://github.com/playwright-community/mcp)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
