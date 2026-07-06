---
name: testing-workers-vitest
description: >-
  Patrones de testing de KeanuOfRivia Website: Vitest + @cloudflare/vitest-pool-workers + TDD estricto.
  Usar al escribir o correr tests del Worker. Cubre: red→green→refactor, correr los tests DENTRO de
  workerd (mismo runtime que prod) con acceso a bindings KV reales, mock de fetch externo (mcstatus.io),
  y test de los endpoints (site-config, mc/status, admin/config).
metadata:
  author: KeanuOfRivia
---

# Testing — Vitest + Cloudflare Workers pool + TDD

Estándares para escribir/correr tests del Worker. Cargá este skill ANTES de escribir tests.

## TDD estricto (constitución II)

Red → Green → Refactor. El test va ANTES de la implementación. Los tests corren **dentro de `workerd`**
(el mismo runtime V8 que producción) vía `@cloudflare/vitest-pool-workers`, con acceso a los **bindings
reales** (KV) que declara `wrangler.toml`. Las APIs externas (mcstatus.io) SIEMPRE mockeadas — nunca
llamadas de red reales en tests.

## Setup (una vez)

```bash
pnpm add -D vitest @cloudflare/vitest-pool-workers
```

`vitest.config.ts` (lee los bindings del `wrangler.toml`, así el KV `CACHE` existe en el test):

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          // vars de test (NO secretos reales): la key admin de test vive acá, no en wrangler.toml
          bindings: { ADMIN_API_KEY: "test-admin-key" },
        },
      },
    },
  },
});
```

## Cómo correr

```bash
pnpm test                       # toda la suite (vitest run en el pool de Workers)
pnpm test -- test/mc-status.test.ts   # un archivo
pnpm typecheck                  # tsc --noEmit (gate, debe dar 0) — si hay TS
```

> Si el pool no arranca (miniflare/workerd no levanta, binding mal configurado) es **ruido de
> entorno**, no una regresión del cambio. El fallo real es un `expect` en rojo, no el arranque.

## Dos estilos de test (según lo que probás)

**1. Unit del Worker (`SELF.fetch` / import del handler)** — probás la lógica de una request end-to-end
dentro del isolate:

```ts
import { env, SELF } from "cloudflare:test";
import { it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.restoreAllMocks());

it("GET /api/site-config devuelve la config y la cachea en KV", async () => {
  const res = await SELF.fetch("https://example.com/api/site-config");
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.title).toBeTruthy();
  // efecto de lado: quedó en KV
  expect(await env.CACHE.get("site-config")).not.toBeNull();
});

it("admin/config sin bearer válido da 401", async () => {
  const res = await SELF.fetch("https://example.com/api/admin/config", { method: "POST" });
  expect(res.status).toBe(401);
});
```

**2. Mock de fetch externo (mcstatus.io)** — nunca pegarle a la API real:

```ts
it("mc/status degrada a offline cuando el upstream falla", async () => {
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("boom", { status: 503 }),
  );
  const res = await SELF.fetch("https://example.com/api/mc/status");
  const body = await res.json();
  expect(body.online).toBe(false);
  spy.mockRestore();
});
```

> Nota: al mockear `fetch` global, acordate que el propio `SELF.fetch` es del harness; mockeá el
> `fetch` que usa el handler para llamar a mcstatus.io. Si preferís aislamiento total, usá
> `fetchMock` de `cloudflare:test` (`import { fetchMock } from "cloudflare:test"`) que intercepta
> outbound requests sin tocar el fetch del harness.

## Qué testear en este proyecto

- `GET /api/site-config`: devuelve config, la persiste en KV con TTL, y sirve del cache en la 2ª llamada.
- `GET /api/mc/status`: parsea/sanitiza la respuesta de mcstatus.io; degrada a `{ online: false }` (503)
  cuando el upstream falla o el fetch tira; respeta el cache de ~60s.
- `POST/DELETE /api/admin/config`: 401 sin bearer o con key inválida; valida el shape del body antes de
  persistir; 200 + efecto en KV con key válida.
- Security headers presentes en toda respuesta.

## Reglas

- Los secretos de test (ej. `ADMIN_API_KEY`) van en `vitest.config.ts` (miniflare bindings), NUNCA la
  key real de prod.
- Nada de llamadas de red reales. Si un test necesita internet, está mal escrito.
- Cobertura objetivo: los tres handlers y el ruteo, incluyendo los caminos de error (upstream caído,
  auth inválida, input malformado).
