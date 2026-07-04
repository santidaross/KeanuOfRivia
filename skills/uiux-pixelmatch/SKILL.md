---
name: uiux-pixelmatch
description: Visual regression testing with pixel-level comparison against Penpot design exports
version: 1.0.0
tags:
  - uiux
  - visual-testing
  - pixelmatch
  - regression
  - penpot
---

# uiux-pixelmatch

Comparacion visual pixel-a-pixel entre screenshots del sitio web y exports de Penpot usando Pixelmatch para detectar regresiones visuales y desviaciones del diseno.

## Overview

Pixelmatch es una libreria minimalista de comparacion de imagenes que:
- Compara dos imagenes PNG pixel a pixel
- Genera una imagen diff resaltando las diferencias
- Retorna el numero de pixeles diferentes
- Soporta tolerancia anti-aliasing y thresholds configurables
- Es extremadamente rapida (~150ms para imagenes 1920x1080)

El workflow principal es: **Penpot Export → Screenshot Web → Pixelmatch Diff → Reporte**.

## Instalacion

```bash
# Node.js (para scripts de comparacion)
npm install pixelmatch pngjs sharp

# Dependencias opcionales para manipulacion de imagenes
npm install jimp  # alternativa a sharp
```

## Script de Comparacion Visual

### Script basico: `scripts/visual-compare.js`

```javascript
const fs = require('fs');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

/**
 * Compara dos imagenes PNG y genera un diff.
 * @param {string} referencePath - Ruta a la imagen de referencia (Penpot export)
 * @param {string} actualPath - Ruta a la imagen actual (screenshot web)
 * @param {string} diffPath - Ruta donde guardar la imagen diff
 * @param {object} options - Opciones de pixelmatch
 * @returns {object} Resultado de la comparacion
 */
function compareImages(referencePath, actualPath, diffPath, options = {}) {
  const defaultOptions = {
    threshold: 0.1,          // Tolerancia de color (0 = exacto, 1 = muy tolerante)
    includeAA: false,        // Ignorar diferencias de anti-aliasing
    alpha: 0.1,              // Opacidad del fondo en la imagen diff
    aaColor: [255, 255, 0],  // Color para diferencias de anti-aliasing (amarillo)
    diffColor: [255, 0, 0],  // Color para diferencias reales (rojo)
    diffColorAlt: null,      // Color alternativo para diff
    diffMask: false,         // Solo mostrar diff sin fondo
  };

  const opts = { ...defaultOptions, ...options };

  const reference = PNG.sync.read(fs.readFileSync(referencePath));
  const actual = PNG.sync.read(fs.readFileSync(actualPath));

  // Las imagenes deben tener el mismo tamano
  if (reference.width !== actual.width || reference.height !== actual.height) {
    console.error(`Size mismatch: reference=${reference.width}x${reference.height}, actual=${actual.width}x${actual.height}`);
    console.error('Resize images to match before comparing.');
    process.exit(1);
  }

  const { width, height } = reference;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    width,
    height,
    opts
  );

  // Guardar imagen diff
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);

  return {
    totalPixels,
    diffPixels: numDiffPixels,
    diffPercentage: parseFloat(diffPercentage),
    width,
    height,
    passed: parseFloat(diffPercentage) <= (opts.passThreshold || 2.0),
  };
}

// CLI usage
if (require.main === module) {
  const [,, reference, actual, diff, threshold] = process.argv;

  if (!reference || !actual || !diff) {
    console.log('Usage: node visual-compare.js <reference.png> <actual.png> <diff.png> [threshold]');
    process.exit(1);
  }

  const result = compareImages(reference, actual, diff, {
    passThreshold: parseFloat(threshold || '2.0'),
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

module.exports = { compareImages };
```

### Script avanzado: `scripts/visual-compare-batch.js`

```javascript
const fs = require('fs');
const path = require('path');
const { compareImages } = require('./visual-compare');

/**
 * Compara todos los screenshots de un directorio contra sus referencias.
 * Estructura esperada:
 *   tests/references/  -> Imagenes de Penpot (referencia)
 *   tests/screenshots/ -> Screenshots actuales (Playwright)
 *   tests/diffs/       -> Imagenes diff (generadas)
 */
function batchCompare(config = {}) {
  const {
    referencesDir = 'tests/references',
    screenshotsDir = 'tests/screenshots',
    diffsDir = 'tests/diffs',
    threshold = 2.0,        // Porcentaje maximo aceptable de diferencia
    pixelThreshold = 0.1,   // Tolerancia de color por pixel
  } = config;

  // Crear directorio de diffs si no existe
  if (!fs.existsSync(diffsDir)) {
    fs.mkdirSync(diffsDir, { recursive: true });
  }

  const references = fs.readdirSync(referencesDir)
    .filter(f => f.endsWith('.png'));

  const results = [];

  for (const filename of references) {
    const referencePath = path.join(referencesDir, filename);
    const actualPath = path.join(screenshotsDir, filename);
    const diffPath = path.join(diffsDir, `diff-${filename}`);

    if (!fs.existsSync(actualPath)) {
      results.push({
        filename,
        status: 'MISSING',
        message: `Screenshot not found: ${actualPath}`,
      });
      continue;
    }

    try {
      const result = compareImages(referencePath, actualPath, diffPath, {
        threshold: pixelThreshold,
        passThreshold: threshold,
      });

      results.push({
        filename,
        status: result.passed ? 'PASS' : 'FAIL',
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
        diffImage: diffPath,
      });
    } catch (error) {
      results.push({
        filename,
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  return results;
}

// CLI usage
if (require.main === module) {
  const results = batchCompare();

  console.log('\n=== Visual Regression Report ===\n');

  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${r.filename}: ${r.status}`);
    if (r.diffPercentage !== undefined) {
      console.log(`   Diff: ${r.diffPercentage}% (${r.diffPixels}/${r.totalPixels} pixels)`);
    }
    if (r.message) {
      console.log(`   ${r.message}`);
    }

    if (r.status === 'PASS') passed++;
    else if (r.status === 'FAIL') failed++;
    else errors++;
  }

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed} | Errors: ${errors}`);
  process.exit(failed > 0 || errors > 0 ? 1 : 0);
}

module.exports = { batchCompare };
```

## Thresholds Recomendados

### Por tipo de componente

| Componente | Threshold | Razon |
|-----------|-----------|-------|
| Iconos/Logos | 0.5% | Deben ser pixel-perfect |
| Tipografia | 1.0% | Font rendering varia entre OS |
| Layout completo | 2.0% | Variaciones menores aceptables |
| Imagenes/Fotos | 3.0% | Compresion puede variar |
| Animaciones (frame) | 5.0% | Timing de captura variable |

### Por viewport

| Viewport | Threshold | Razon |
|----------|-----------|-------|
| Desktop 1440px | 1.5% | Mas espacio, menos variacion |
| Tablet 768px | 2.0% | Layouts intermedios |
| Mobile 375px | 2.5% | Mas variacion por espacio reducido |

### Opciones de pixelmatch por caso

```javascript
// Comparacion estricta (iconos, logos)
const strictOptions = {
  threshold: 0.05,
  includeAA: true,
};

// Comparacion normal (layouts, paginas)
const normalOptions = {
  threshold: 0.1,
  includeAA: false,
};

// Comparacion tolerante (contenido dinamico)
const tolerantOptions = {
  threshold: 0.3,
  includeAA: false,
};
```

## Workflow con Penpot MCP

### Paso 1: Exportar referencia desde Penpot

```bash
# Usando el MCP de Penpot:
# 1. Listar proyectos -> encontrar el proyecto correcto
# -> list_projects()

# 2. Listar archivos del proyecto
# -> list_files(project_id="...")

# 3. Obtener la pagina con los frames
# -> get_page(file_id="...", page_id="...")

# 4. Exportar el frame como PNG a 2x para retina
# -> export_frame(file_id="...", frame_id="...", format="png", scale=2)

# 5. Guardar en tests/references/<pagename>-<viewport>.png
# Ejemplo: tests/references/dashboard-desktop.png
```

### Paso 2: Capturar screenshot con Playwright MCP

```bash
# Usando el MCP de Playwright:
# 1. Navegar a la pagina
# -> browser_navigate(url="http://localhost:4321/dashboard")

# 2. Configurar viewport
# -> browser_resize(width=1440, height=900)

# 3. Esperar a que cargue completamente
# -> browser_snapshot()  # Verificar que el contenido esta visible

# 4. Capturar screenshot
# -> browser_screenshot()
# -> Guardar como tests/screenshots/dashboard-desktop.png
```

### Paso 3: Comparar con Pixelmatch

```bash
# Ejecutar comparacion
node scripts/visual-compare.js \
  tests/references/dashboard-desktop.png \
  tests/screenshots/dashboard-desktop.png \
  tests/diffs/dashboard-desktop-diff.png \
  2.0

# Output:
# {
#   "totalPixels": 1296000,
#   "diffPixels": 2592,
#   "diffPercentage": 0.2,
#   "passed": true
# }
```

### Paso 4: Batch comparison (todas las paginas)

```bash
node scripts/visual-compare-batch.js

# Output:
# === Visual Regression Report ===
# ✅ dashboard-desktop.png: PASS (0.2%)
# ✅ login-desktop.png: PASS (0.1%)
# ❌ settings-mobile.png: FAIL (3.5%)
# ⚠️ checkout-tablet.png: MISSING
```

## Normalizacion de Imagenes

### Redimensionar imagenes para que coincidan

```javascript
const sharp = require('sharp');

/**
 * Normaliza dos imagenes al mismo tamano antes de comparar.
 * Usa las dimensiones de la imagen de referencia (Penpot).
 */
async function normalizeImages(referencePath, actualPath) {
  const refMeta = await sharp(referencePath).metadata();
  const { width, height } = refMeta;

  // Redimensionar actual al tamano de referencia
  const normalizedPath = actualPath.replace('.png', '-normalized.png');
  await sharp(actualPath)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(normalizedPath);

  return normalizedPath;
}
```

### Recortar areas especificas

```javascript
/**
 * Recortar un area especifica para comparacion focalizada.
 * Util cuando solo quieres comparar un componente, no la pagina completa.
 */
async function cropRegion(imagePath, region) {
  const { left, top, width, height } = region;
  const croppedPath = imagePath.replace('.png', `-crop-${left}-${top}.png`);

  await sharp(imagePath)
    .extract({ left, top, width, height })
    .toFile(croppedPath);

  return croppedPath;
}

// Ejemplo: comparar solo el header
// const refCropped = await cropRegion('tests/references/dashboard.png', { left: 0, top: 0, width: 1440, height: 80 });
// const actCropped = await cropRegion('tests/screenshots/dashboard.png', { left: 0, top: 0, width: 1440, height: 80 });
// const result = compareImages(refCropped, actCropped, 'tests/diffs/header-diff.png');
```

## Reporte para Beads

### Formato de reporte estandar

```bash
bd comments add task-id "[UI/UX Tester] Visual Fidelity Report:
Page: /dashboard
Penpot frame: Dashboard-v2.3
Viewport: 1440x900 (Desktop)

Overall match: 98.5% ✅ (threshold: 98%)

Region breakdown:
  - Header:  99.8% ✅
  - Sidebar: 96.5% ❌ (icon colors differ)
  - Content: 99.2% ✅
  - Footer:  100%  ✅

Diff images: tests/diffs/dashboard-desktop-diff.png
Action: Create bug for sidebar icon mismatch"
```

### Formato de reporte para bugs

```bash
bd create "Visual: Sidebar icon color mismatch vs Penpot (#1a1a2e vs #1a1a3e)" \
  -t bug -p 1 -l uiux,visual,frontend \
  --assignee knowledge-4yh \
  -d "Pixelmatch: 3.5% diff en sidebar.
Reference (Penpot): tests/references/dashboard-desktop.png
Actual (Web): tests/screenshots/dashboard-desktop.png
Diff: tests/diffs/dashboard-desktop-diff.png
Region: sidebar area (x:0, y:80, w:250, h:820)
Expected: icons in #1a1a2e
Actual: icons in #1a1a3e"
```

## Design Tokens Validation

### Comparar tokens de Penpot con CSS

```javascript
/**
 * Valida que los design tokens de Penpot coincidan con los CSS custom properties.
 * Usa Penpot MCP para obtener tokens y Playwright MCP para leer CSS.
 */
async function validateDesignTokens(penpotTokens, cssVariables) {
  const mismatches = [];

  // Comparar colores
  for (const [name, penpotValue] of Object.entries(penpotTokens.colors)) {
    const cssValue = cssVariables[`--color-${name}`];
    if (cssValue && cssValue.toLowerCase() !== penpotValue.toLowerCase()) {
      mismatches.push({
        type: 'color',
        token: name,
        penpot: penpotValue,
        css: cssValue,
      });
    }
  }

  // Comparar tipografia
  for (const [name, penpotValue] of Object.entries(penpotTokens.typography)) {
    const cssFontSize = cssVariables[`--font-size-${name}`];
    if (cssFontSize && cssFontSize !== penpotValue.fontSize) {
      mismatches.push({
        type: 'typography',
        token: name,
        penpot: penpotValue.fontSize,
        css: cssFontSize,
      });
    }
  }

  return mismatches;
}
```

## Mejores Practicas

### DO

- Normalizar imagenes al mismo tamano antes de comparar
- Usar `includeAA: false` para ignorar diferencias de anti-aliasing entre OS
- Guardar referencias de Penpot con nombre descriptivo: `{page}-{viewport}.png`
- Actualizar referencias cuando el diseno cambie intencionalmente
- Comparar por regiones para localizar problemas especificos
- Documentar thresholds por componente en el proyecto

### DON'T

- Comparar imagenes de tamanos diferentes (pixelmatch fallara)
- Usar threshold muy bajo (< 0.05) para paginas completas — demasiados false positives
- Comparar screenshots con contenido dinamico (fechas, avatares) sin mascaras
- Olvidar actualizar las referencias cuando el diseno cambia
- Ignorar diferencias de anti-aliasing sin investigar si es real

## Recursos

- [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch)
- [Pixelmatch API](https://github.com/mapbox/pixelmatch#api)
- [PNGjs](https://github.com/lukeapage/pngjs)
- [Sharp (image processing)](https://sharp.pixelplumbing.com/)
