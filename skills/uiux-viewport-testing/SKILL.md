---
name: uiux-viewport-testing
description: Responsive design testing across mobile, tablet, and desktop breakpoints
version: 1.0.0
tags:
  - uiux
  - responsive
  - viewport
  - mobile
  - breakpoints
---

# uiux-viewport-testing

Testing de responsividad y diseno adaptativo en multiples viewports (Mobile, Tablet, Desktop) usando Playwright MCP para redimensionar el navegador y capturar screenshots comparativos.

## Overview

El viewport testing valida que el diseno se adapte correctamente a:
- **Mobile** (375x812) — iPhone SE / iPhone 14 standard
- **Tablet** (768x1024) — iPad standard
- **Desktop** (1440x900) — Laptop standard

Combinado con Pixelmatch para comparar contra disenos de Penpot en cada breakpoint.

## Breakpoints Estandar

### Breakpoints primarios

| Nombre | Width | Height | Dispositivo referencia | CSS Media Query |
|--------|-------|--------|----------------------|----------------|
| Mobile S | 320px | 568px | iPhone SE (1st gen) | `max-width: 374px` |
| Mobile | 375px | 812px | iPhone 14 | `max-width: 767px` |
| Mobile L | 428px | 926px | iPhone 14 Pro Max | `max-width: 767px` |
| Tablet | 768px | 1024px | iPad | `min-width: 768px` and `max-width: 1023px` |
| Tablet L | 1024px | 1366px | iPad Pro 12.9" | `min-width: 1024px` and `max-width: 1279px` |
| Desktop | 1440px | 900px | Laptop standard | `min-width: 1280px` |
| Desktop L | 1920px | 1080px | Full HD monitor | `min-width: 1440px` |

### Breakpoints minimos recomendados

Para testing eficiente, usar al menos estos 3:

```
Mobile:  375 x 812   (el mas comun)
Tablet:  768 x 1024  (breakpoint clasico)
Desktop: 1440 x 900  (laptop estandar)
```

## Workflow con Playwright MCP

### Test basico de responsividad

```
# PASO 1: Desktop (1440x900)
-> browser_navigate(url="http://localhost:4321/dashboard")
-> browser_resize(width=1440, height=900)
-> browser_snapshot()  # Verificar layout desktop
-> browser_screenshot()  # Guardar como dashboard-desktop.png

# PASO 2: Tablet (768x1024)
-> browser_resize(width=768, height=1024)
-> browser_snapshot()  # Verificar adaptacion
-> browser_screenshot()  # Guardar como dashboard-tablet.png

# PASO 3: Mobile (375x812)
-> browser_resize(width=375, height=812)
-> browser_snapshot()  # Verificar layout mobile
-> browser_screenshot()  # Guardar como dashboard-mobile.png
```

### Test completo con verificaciones

```
# === DESKTOP (1440x900) ===
-> browser_navigate(url="http://localhost:4321/dashboard")
-> browser_resize(width=1440, height=900)
-> browser_snapshot()

Verificar:
- [ ] Sidebar visible y expandida
- [ ] Grid de cards en 3 columnas
- [ ] Tabla completa visible
- [ ] Navigation bar con todos los items
- [ ] Hover states funcionales

-> browser_screenshot()

# === TABLET (768x1024) ===
-> browser_resize(width=768, height=1024)
-> browser_snapshot()

Verificar:
- [ ] Sidebar colapsada o hamburger menu
- [ ] Grid de cards en 2 columnas
- [ ] Tabla con scroll horizontal si es necesario
- [ ] Navigation adaptada (puede ser hamburger)
- [ ] Touch targets >= 44x44px

-> browser_screenshot()

# === MOBILE (375x812) ===
-> browser_resize(width=375, height=812)
-> browser_snapshot()

Verificar:
- [ ] Sidebar oculta (hamburger menu)
- [ ] Cards en 1 columna (stack vertical)
- [ ] Tabla responsive (cards o scroll)
- [ ] Navigation como hamburger o bottom nav
- [ ] No horizontal scroll
- [ ] Texto legible sin zoom
- [ ] Touch targets >= 44x44px

-> browser_screenshot()
```

### Test de orientacion (Tablet/Mobile)

```
# Tablet Portrait
-> browser_resize(width=768, height=1024)
-> browser_screenshot()

# Tablet Landscape
-> browser_resize(width=1024, height=768)
-> browser_screenshot()

# Mobile Portrait
-> browser_resize(width=375, height=812)
-> browser_screenshot()

# Mobile Landscape
-> browser_resize(width=812, height=375)
-> browser_screenshot()
```

## Script de Test Automatizado

### `scripts/viewport-test.js`

```javascript
const { chromium } = require('playwright');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, deviceScaleFactor: 2 },
  { name: 'tablet', width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];

/**
 * Toma screenshots de una pagina en todos los viewports.
 * @param {string} url - URL de la pagina
 * @param {string} pageName - Nombre para los archivos
 * @param {string} outputDir - Directorio de salida
 */
async function viewportTest(url, pageName, outputDir = 'tests/screenshots') {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    // Esperar a que todo se renderize
    await page.waitForTimeout(1000);

    const filename = `${pageName}-${vp.name}.png`;
    const filepath = `${outputDir}/${filename}`;

    await page.screenshot({
      path: filepath,
      fullPage: true,
    });

    // Verificaciones basicas
    const checks = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;

      return {
        hasHorizontalScroll: body.scrollWidth > html.clientWidth,
        bodyWidth: body.scrollWidth,
        viewportWidth: html.clientWidth,
        contentOverflow: body.scrollWidth - html.clientWidth,
      };
    });

    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      screenshot: filepath,
      horizontalScroll: checks.hasHorizontalScroll,
      contentOverflow: checks.contentOverflow,
      passed: !checks.hasHorizontalScroll,
    });

    await context.close();
  }

  await browser.close();
  return results;
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:4321';
  const pageName = process.argv[3] || 'page';

  viewportTest(url, pageName).then(results => {
    console.log('\n=== Viewport Test Results ===\n');

    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.viewport} (${r.width}x${r.height})`);
      if (r.horizontalScroll) {
        console.log(`   ⚠️ Horizontal scroll detected: ${r.contentOverflow}px overflow`);
      }
      console.log(`   Screenshot: ${r.screenshot}`);
    }

    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  });
}

module.exports = { viewportTest, VIEWPORTS };
```

### Test con comparacion visual por viewport

```javascript
const { viewportTest, VIEWPORTS } = require('./viewport-test');
const { compareImages } = require('./visual-compare');

/**
 * Toma screenshots en todos los viewports y compara contra referencias de Penpot.
 */
async function viewportVisualTest(url, pageName, options = {}) {
  const {
    referencesDir = 'tests/references',
    screenshotsDir = 'tests/screenshots',
    diffsDir = 'tests/diffs',
    thresholds = {
      mobile: 2.5,
      tablet: 2.0,
      desktop: 1.5,
    },
  } = options;

  // Tomar screenshots en todos los viewports
  const screenshots = await viewportTest(url, pageName, screenshotsDir);

  // Comparar contra referencias
  const results = [];

  for (const s of screenshots) {
    const referencePath = `${referencesDir}/${pageName}-${s.viewport}.png`;
    const diffPath = `${diffsDir}/${pageName}-${s.viewport}-diff.png`;

    try {
      const comparison = compareImages(referencePath, s.screenshot, diffPath, {
        passThreshold: thresholds[s.viewport] || 2.0,
      });

      results.push({
        ...s,
        visual: {
          diffPercentage: comparison.diffPercentage,
          threshold: thresholds[s.viewport],
          passed: comparison.passed,
          diffImage: diffPath,
        },
      });
    } catch (error) {
      results.push({
        ...s,
        visual: {
          error: error.message,
          passed: false,
        },
      });
    }
  }

  return results;
}

module.exports = { viewportVisualTest };
```

## Checklist de Responsividad

### Layout

```
Mobile (375px):
  - [ ] Single column layout
  - [ ] No horizontal scrollbar
  - [ ] Content fills full width (con padding)
  - [ ] Stacked cards/elements
  - [ ] Hidden sidebar (hamburger menu)

Tablet (768px):
  - [ ] 2-column grid donde aplique
  - [ ] Sidebar colapsable o mini
  - [ ] Tablas con scroll horizontal si necesario
  - [ ] Sufficient spacing entre elementos

Desktop (1440px):
  - [ ] Full multi-column layout
  - [ ] Sidebar expandida
  - [ ] Tablas completas visibles
  - [ ] Max-width en contenido (no se estira infinitamente)
```

### Tipografia

```
- [ ] Texto legible sin zoom en todos los viewports
- [ ] Tamano minimo 16px en mobile (evita zoom en iOS)
- [ ] Line-height adecuado (1.4-1.6 para body text)
- [ ] Headings se escalan proporcionalmente
- [ ] No texto truncado que pierda significado
```

### Touch Targets (Mobile/Tablet)

```
- [ ] Botones: minimo 44x44px (Apple HIG) / 48x48px (Material)
- [ ] Links en listas: suficiente padding vertical
- [ ] Spacing entre targets: minimo 8px
- [ ] Inputs: height minimo 44px
- [ ] Checkboxes/radios: area clickeable suficiente
```

### Imagenes y Media

```
- [ ] Imagenes responsive (max-width: 100%)
- [ ] No imagenes cortadas o distorsionadas
- [ ] Lazy loading en imagenes below-the-fold
- [ ] Videos/embeds responsive (aspect-ratio preserved)
- [ ] Icons escalan correctamente
```

### Navegacion

```
Mobile:
  - [ ] Hamburger menu funcional
  - [ ] Menu overlay/slide-in correcto
  - [ ] Close button accesible
  - [ ] Bottom navigation (si aplica)

Tablet:
  - [ ] Navigation adaptada (icons + text, o hamburger)
  - [ ] Submenus accesibles

Desktop:
  - [ ] Full navigation bar
  - [ ] Hover states en items
  - [ ] Dropdowns/megamenus funcionales
  - [ ] Active state visible
```

### Forms

```
- [ ] Inputs ocupan full width en mobile
- [ ] Labels encima de inputs en mobile (no al lado)
- [ ] Keyboard apropiado (email, tel, number) en mobile
- [ ] Form no se rompe con keyboard abierto
- [ ] Submit button accesible en todos los viewports
- [ ] Error messages visibles sin scroll
```

## Problemas Comunes y Soluciones

### Horizontal Scroll

```
# Detectar elementos que causan overflow:
# Usar Playwright MCP:
-> browser_resize(width=375, height=812)
-> browser_snapshot()

# Buscar en el accessibility tree elementos que se salen del viewport

# Causas comunes:
# 1. Tablas anchas sin overflow-x
# 2. Imagenes sin max-width: 100%
# 3. Elementos con width fijo en px
# 4. Pre/code blocks sin overflow-wrap
# 5. Flexbox/grid sin flex-wrap
```

### Layout Shifts (CLS)

```
# Cambiar viewport y observar si hay layout shifts:
-> browser_resize(width=1440, height=900)
-> browser_screenshot()  # Desktop
-> browser_resize(width=375, height=812)
-> browser_wait(time=500)  # Esperar reflow
-> browser_screenshot()  # Mobile

# Verificar que no hay:
# - Contenido que salta al cargar imagenes
# - Fonts que causan reflow (FOUT/FOIT)
# - Ads/embeds que empujan contenido
```

### Breakpoint Boundary Testing

```
# Testear justo en los bordes de los breakpoints:

# Justo antes del breakpoint tablet (767px)
-> browser_resize(width=767, height=1024)
-> browser_screenshot()

# Justo en el breakpoint tablet (768px)
-> browser_resize(width=768, height=1024)
-> browser_screenshot()

# Verificar que la transicion es suave y no hay estados "rotos"
```

## Reporte para Beads

### Formato estandar

```bash
bd comments add task-id "[UI/UX Tester] Responsive Testing Report:
Page: /dashboard

Mobile (375x812):
  Layout: ✅ Single column, sidebar hidden
  Scroll: ✅ No horizontal overflow
  Touch: ✅ All targets >= 44px
  Text: ✅ Readable without zoom
  Nav: ✅ Hamburger menu works
  Issues: None

Tablet (768x1024):
  Layout: ✅ 2-column grid
  Scroll: ✅ No horizontal overflow
  Touch: ✅ All targets >= 44px
  Nav: ✅ Collapsed sidebar
  Orientation: ✅ Portrait + Landscape OK
  Issues: None

Desktop (1440x900):
  Layout: ✅ Full 3-column + sidebar
  Scroll: ✅ No overflow
  Hover: ✅ All hover states work
  Nav: ✅ Full navigation bar
  Issues: None

Visual vs Penpot:
  Mobile:  98.2% match ✅
  Tablet:  97.5% match ✅
  Desktop: 99.1% match ✅

Overall: PASS (0 issues)"
```

### Formato de bug responsive

```bash
bd create "Responsive: Table overflows on Mobile 375px in /dashboard" \
  -t bug -p 1 -l uiux,responsive,frontend \
  --assignee knowledge-4yh \
  -d "Viewport testing: tabla de datos hace overflow horizontal en 375px.
Viewport: 375x812
Page: /dashboard
Element: .data-table
Overflow: 120px beyond viewport
Screenshot: tests/screenshots/dashboard-mobile.png

Suggested fixes:
1. Add overflow-x: auto to table container
2. Use responsive table pattern (cards on mobile)
3. Hide non-essential columns on mobile with display: none"
```

## Integracion con CI/CD

### GitHub Actions

```yaml
name: Viewport Testing
on:
  pull_request:
  push:
    branches: [main]

jobs:
  viewport:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install chromium

      - name: Start dev server
        run: npm run dev &
        env:
          PORT: 4321

      - name: Wait for server
        run: npx wait-on http://localhost:4321

      - name: Run viewport tests
        run: node scripts/viewport-test.js http://localhost:4321 home

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: viewport-screenshots
          path: tests/screenshots/
```

## Mejores Practicas

### DO

- Testear en los 3 breakpoints minimos (375, 768, 1440) para cada pagina
- Verificar orientacion portrait y landscape en tablet y mobile
- Testear en los bordes de breakpoints (767px, 768px) para detectar estados rotos
- Verificar touch targets en mobile (minimo 44x44px)
- Comparar cada viewport contra su referencia de Penpot correspondiente
- Testear con contenido real (no lorem ipsum) para detectar overflow

### DON'T

- Asumir que "se ve bien en desktop" significa que funciona en mobile
- Ignorar horizontal scroll — es el bug responsive mas comun
- Testear solo en portrait — landscape puede romper layouts
- Olvidar testear formularios con keyboard virtual abierto en mobile
- Usar viewports exactos de un solo dispositivo — testear rangos
- Confiar solo en media queries — testear visualmente

## Recursos

- [Responsive Design Checker](https://responsivedesignchecker.com/)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Viewport Sizes Reference](https://viewportsizer.com/)
- [Can I Use (Media Queries)](https://caniuse.com/css-mediaqueries)
- [Apple HIG - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/accessibility#Touch-targets)
- [Material Design - Touch Targets](https://m3.material.io/foundations/accessible-design/accessibility-basics#28032e45-c598-450c-b355-f9fe737b1571)
