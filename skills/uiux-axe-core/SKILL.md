---
name: uiux-axe-core
description: WCAG 2.1 AA/AAA accessibility validation with axe-core and Playwright integration
version: 1.0.0
tags:
  - uiux
  - accessibility
  - wcag
  - axe-core
  - a11y
---

# uiux-axe-core

Validacion de accesibilidad web segun WCAG 2.1 AA/AAA usando axe-core integrado con Playwright para auditorias automatizadas de accesibilidad.

## Overview

axe-core es el motor de reglas de accesibilidad mas usado en la industria:
- Detecta automaticamente ~50% de las violaciones WCAG
- Zero false positives (confianza en los resultados)
- Categoriza severidad: critical, serious, moderate, minor
- Soporta WCAG 2.0/2.1 niveles A, AA y AAA
- Integrable con Playwright, Puppeteer, Selenium, Cypress
- Usado por Google, Microsoft, Deque

## Instalacion

```bash
# Para uso con Playwright (recomendado)
npm install @axe-core/playwright

# axe-core standalone (para inyectar via script)
npm install axe-core

# Para reportes HTML
npm install axe-html-reporter
```

## Integracion con Playwright

### Script basico: `scripts/a11y-audit.js`

```javascript
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

/**
 * Ejecuta una auditoria de accesibilidad en una pagina.
 * @param {string} url - URL de la pagina a auditar
 * @param {object} options - Opciones de configuracion
 * @returns {object} Resultados de axe-core
 */
async function auditPage(url, options = {}) {
  const {
    tags = ['wcag2a', 'wcag2aa'],  // Nivel WCAG
    browser: browserType = 'chromium',
    viewport = { width: 1440, height: 900 },
    includeRules = [],
    excludeRules = [],
    exclude = [],  // Selectores CSS a excluir
  } = options;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    let builder = new AxeBuilder({ page })
      .withTags(tags);

    if (includeRules.length > 0) {
      builder = builder.withRules(includeRules);
    }

    if (excludeRules.length > 0) {
      builder = builder.disableRules(excludeRules);
    }

    for (const selector of exclude) {
      builder = builder.exclude(selector);
    }

    const results = await builder.analyze();

    return {
      url,
      timestamp: new Date().toISOString(),
      violations: results.violations,
      passes: results.passes.length,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable.length,
    };
  } finally {
    await browser.close();
  }
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:4321';
  const level = process.argv[3] || 'aa';

  const tags = level === 'aaa'
    ? ['wcag2a', 'wcag2aa', 'wcag2aaa']
    : ['wcag2a', 'wcag2aa'];

  auditPage(url, { tags }).then(results => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.violations.length > 0 ? 1 : 0);
  });
}

module.exports = { auditPage };
```

### Auditoria multi-pagina: `scripts/a11y-audit-batch.js`

```javascript
const { auditPage } = require('./a11y-audit');

/**
 * Audita multiples paginas y genera un reporte consolidado.
 */
async function batchAudit(pages, options = {}) {
  const results = [];

  for (const { url, name } of pages) {
    console.log(`Auditing: ${name} (${url})...`);
    try {
      const result = await auditPage(url, options);
      results.push({ name, ...result });
    } catch (error) {
      results.push({
        name,
        url,
        error: error.message,
        violations: [],
        passes: 0,
      });
    }
  }

  return results;
}

// CLI usage
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:4321';

  const pages = [
    { name: 'Home', url: `${baseUrl}/` },
    { name: 'Login', url: `${baseUrl}/login` },
    { name: 'Dashboard', url: `${baseUrl}/dashboard` },
    { name: 'Settings', url: `${baseUrl}/settings` },
  ];

  batchAudit(pages).then(results => {
    console.log('\n=== Accessibility Audit Report ===\n');

    let totalViolations = 0;
    for (const r of results) {
      const icon = r.violations.length === 0 ? '✅' : '❌';
      console.log(`${icon} ${r.name}: ${r.violations.length} violations, ${r.passes} passes`);
      totalViolations += r.violations.length;

      for (const v of r.violations) {
        console.log(`   ${v.impact.toUpperCase()}: ${v.id} - ${v.description}`);
        console.log(`   Affected: ${v.nodes.length} element(s)`);
      }
    }

    console.log(`\nTotal violations: ${totalViolations}`);
    process.exit(totalViolations > 0 ? 1 : 0);
  });
}

module.exports = { batchAudit };
```

## Uso con Playwright MCP

Cuando usas el Playwright MCP directamente (sin scripts), puedes inyectar axe-core:

```
# PASO 1: Navegar a la pagina
-> browser_navigate(url="http://localhost:4321/dashboard")

# PASO 2: Usar browser_snapshot() para obtener el accessibility tree
-> browser_snapshot()

# El accessibility tree muestra:
# - Roles de elementos (button, link, heading, etc.)
# - Accessible names
# - Estados (expanded, selected, checked)
# - Jerarquia de landmarks (main, nav, aside)

# PASO 3: Verificar manualmente en el tree:
# - Todos los botones tienen nombres
# - Los headings tienen jerarquia logica (h1 -> h2 -> h3)
# - Los formularios tienen labels
# - Las imagenes tienen alt text
# - Los landmarks estan presentes
```

## Reglas WCAG Clave

### Nivel A (Minimo obligatorio)

| Regla | WCAG | Descripcion | Ejemplo |
|-------|------|-------------|---------|
| `image-alt` | 1.1.1 | Imagenes deben tener alt text | `<img alt="Logo">` |
| `label` | 1.3.1 | Inputs deben tener label asociado | `<label for="email">` |
| `link-name` | 2.4.4 | Links deben tener texto descriptivo | `<a>Read more about X</a>` |
| `button-name` | 4.1.2 | Botones deben tener nombre accessible | `<button aria-label="Close">` |
| `html-lang` | 3.1.1 | HTML debe tener atributo lang | `<html lang="es">` |
| `bypass` | 2.4.1 | Mecanismo para saltar contenido repetido | Skip-to-main link |
| `document-title` | 2.4.2 | Pagina debe tener titulo | `<title>Dashboard</title>` |

### Nivel AA (Estandar recomendado)

| Regla | WCAG | Descripcion | Ejemplo |
|-------|------|-------------|---------|
| `color-contrast` | 1.4.3 | Contraste minimo 4.5:1 (texto normal) | Texto oscuro sobre fondo claro |
| `heading-order` | 1.3.1 | Headings en orden logico | h1 → h2 → h3, sin saltar |
| `region` | 1.3.1 | Contenido dentro de landmarks | `<main>`, `<nav>`, `<aside>` |
| `autocomplete-valid` | 1.3.5 | Autocomplete values validos | `autocomplete="email"` |
| `target-size` | 2.5.8 | Touch targets minimo 24x24px | Botones suficientemente grandes |

### Nivel AAA (Maximo)

| Regla | WCAG | Descripcion | Ejemplo |
|-------|------|-------------|---------|
| `color-contrast-enhanced` | 1.4.6 | Contraste minimo 7:1 | Para maxima legibilidad |
| `identical-links-same-purpose` | 2.4.9 | Links identicos mismo destino | Evitar "Click here" duplicados |

## Severidad de Violaciones

### Impact levels (axe-core)

| Impact | Significado | Accion | SLA |
|--------|------------|--------|-----|
| `critical` | Bloquea acceso completo para algunos usuarios | Fix inmediato | 24h |
| `serious` | Dificulta significativamente el uso | Fix antes de release | 3 dias |
| `moderate` | Causa inconveniencia pero no bloquea | Fix en sprint actual | 2 semanas |
| `minor` | Mejora de experiencia, no bloquea | Backlog | Best effort |

### Politica de gates por ambiente

```javascript
// Configuracion de gates por ambiente
const gates = {
  development: {
    failOn: ['critical'],           // Solo bloquear en critical
    warnOn: ['serious', 'moderate'],
  },
  staging: {
    failOn: ['critical', 'serious'],  // Bloquear en critical y serious
    warnOn: ['moderate'],
  },
  production: {
    failOn: ['critical', 'serious', 'moderate'],  // Bloquear todo excepto minor
    warnOn: ['minor'],
  },
};
```

## Verificaciones Manuales Complementarias

axe-core detecta ~50% de los issues. Estas verificaciones deben hacerse manualmente:

### Keyboard Navigation

```
# Usando Playwright MCP:

PASO 1: Verificar que se puede navegar con Tab
-> browser_press_key(key="Tab")
-> browser_snapshot()  # Verificar que el foco esta visible

PASO 2: Verificar tab order logico
-> browser_press_key(key="Tab")  # Repetir y verificar orden

PASO 3: Verificar que Enter/Space activan elementos
-> browser_press_key(key="Enter")
-> browser_snapshot()  # Verificar que se activo

PASO 4: Verificar Escape cierra modales
-> browser_press_key(key="Escape")
-> browser_snapshot()
```

### Focus Management

```
# Verificar focus indicators visibles:
-> browser_press_key(key="Tab")
-> browser_screenshot()  # El elemento enfocado debe tener outline visible

# Verificar focus trap en modales:
# Abrir modal, Tab repetido no debe salir del modal
```

### Screen Reader Compatibility

```
# Usando browser_snapshot() para leer el accessibility tree:
-> browser_snapshot()

# Verificar:
# 1. Todos los elementos interactivos tienen roles correctos
# 2. Las labels son descriptivas (no "click here" o "button 1")
# 3. Los aria-live regions estan presentes para contenido dinamico
# 4. Los headings forman una estructura logica
# 5. Las tablas de datos tienen th y scope
```

## Reporte para Beads

### Formato de reporte estandar

```bash
bd comments add task-id "[UI/UX Tester] Accessibility Audit (WCAG 2.1 AA):
Page: /dashboard
Tool: axe-core v4.9 + manual verification

Violations (3):
  CRITICAL (1):
    - color-contrast: 2 elements with insufficient ratio
      → .sidebar-link: 3.2:1 (need 4.5:1) - text '#888' on '#333'
      → .card-subtitle: 3.8:1 (need 4.5:1) - text '#999' on '#fff'

  SERIOUS (1):
    - button-name: 1 button without accessible name
      → #toggle-sidebar (icon-only button, needs aria-label='Toggle sidebar')

  MODERATE (1):
    - heading-order: Heading level skipped
      → h1 followed by h3 (missing h2)

Passes: 45 rules passed
Incomplete: 2 (need manual review for keyboard focus order)

Manual Checks:
  ✅ Keyboard navigation: Tab order logical
  ✅ Focus indicators: Visible on all interactive elements
  ❌ Skip-to-main: Missing skip navigation link
  ✅ Lang attribute: Present on <html>
  ✅ Page title: Descriptive"
```

### Formato de bug para violaciones

```bash
# Bug critico de accesibilidad
bd create "A11y: Insufficient color contrast on sidebar links (3.2:1, need 4.5:1)" \
  -t bug -p 0 -l uiux,a11y,frontend,wcag-aa \
  --assignee knowledge-4yh \
  -d "axe-core violation: color-contrast (WCAG 1.4.3)
Impact: CRITICAL
Elements: .sidebar-link (2 instances)
Current: text #888 on background #333 = 3.2:1
Required: 4.5:1 (normal text)
Fix: Change text to #b3b3b3 or lighter for 4.5:1 ratio
Tool: https://webaim.org/resources/contrastchecker/"

# Bug serio
bd create "A11y: Toggle sidebar button missing accessible name" \
  -t bug -p 1 -l uiux,a11y,frontend,wcag-aa \
  --assignee knowledge-4yh \
  -d "axe-core violation: button-name (WCAG 4.1.2)
Impact: SERIOUS
Element: #toggle-sidebar (icon-only button)
Fix: Add aria-label='Toggle sidebar' or visually hidden text"
```

## Integracion con CI/CD

### GitHub Actions workflow

```yaml
name: Accessibility Audit
on:
  pull_request:
  push:
    branches: [main]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start dev server
        run: npm run dev &
        env:
          PORT: 4321

      - name: Wait for server
        run: npx wait-on http://localhost:4321

      - name: Run accessibility audit
        run: node scripts/a11y-audit-batch.js http://localhost:4321

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: a11y-results.json
```

## Contrast Ratio Quick Reference

### Texto normal (< 18pt / < 14pt bold)

| Nivel | Ratio Minimo | Ejemplo |
|-------|-------------|---------|
| AA | 4.5:1 | `#767676` on `#ffffff` |
| AAA | 7:1 | `#595959` on `#ffffff` |

### Texto grande (>= 18pt / >= 14pt bold)

| Nivel | Ratio Minimo | Ejemplo |
|-------|-------------|---------|
| AA | 3:1 | `#949494` on `#ffffff` |
| AAA | 4.5:1 | `#767676` on `#ffffff` |

### UI Components (iconos, bordes)

| Nivel | Ratio Minimo | Nota |
|-------|-------------|------|
| AA | 3:1 | Bordes de input, iconos funcionales |

## Mejores Practicas

### DO

- Ejecutar axe-core en cada pagina nueva antes de marcar como completa
- Verificar keyboard navigation manualmente (axe-core no cubre todo)
- Reportar el WCAG criterion especifico (e.g., "1.4.3") en cada bug
- Testear con alto contraste y zoom 200%
- Verificar el accessibility tree con `browser_snapshot()`
- Incluir sugerencias de fix en cada bug report

### DON'T

- Depender solo de axe-core — cubre ~50% de WCAG
- Ignorar violaciones "moderate" — afectan la experiencia
- Asumir que ARIA resuelve todo — el HTML semantico primero
- Olvidar testear contenido dinamico (modales, toasts, dropdowns)
- Usar role="presentation" para ocultar problemas en vez de arreglarlos
- Ignorar la jerarquia de headings (h1 → h2 → h3 sin saltos)

## Recursos

- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Deque University](https://dequeuniversity.com/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
