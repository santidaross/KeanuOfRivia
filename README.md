# KeanuOfRivia Website

Sitio web personal de **Keanu Of Rivia** sobre **Cloudflare Workers**. Una landing tipo "link-in-bio"
que centraliza los enlaces públicos (Minecraft, Steam, Buy Me A Coffee) y muestra el estado en vivo
del server de Minecraft. El sitio estático se sirve desde `public/` y la API corre en el edge.

## Stack

- **Cloudflare Workers** (`wrangler`) — runtime `workerd`, JS puro, sin build.
- **Cloudflare KV** (binding `CACHE`) — config del sitio, estado de Minecraft y rate-limiting (con TTL).
- **Assets estáticos** (`public/`) — `index.html`, `css/`, `fonts/`, `images/`, servidos vía `env.ASSETS`.
- **Testing**: Vitest + `@cloudflare/vitest-pool-workers`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/site-config` | Configuración del sitio (título, descripción, links), cacheada en KV |
| GET | `/api/mc/status` | Estado del server de Minecraft (proxy a mcstatus.io, cache ~60s) |
| GET | `/api/mc/server-info` | Info extendida del server |
| GET/POST/DELETE | `/api/admin/config` | CRUD de la config — requiere `Authorization: Bearer <ADMIN_API_KEY>` |

Cualquier otra ruta sirve el sitio estático desde `public/`.

## Desarrollo local

```bash
pnpm install                      # deps + git hooks (lefthook)
cp .dev.vars.example .dev.vars   # y poné una key de dev en ADMIN_API_KEY (NO se commitea)
pnpm dev                      # wrangler dev → http://localhost:8787
pnpm test                     # vitest en el pool de Workers
```

No hace falta Docker: los Workers corren local nativamente con `wrangler dev` (`workerd`).

## Deploy

```bash
pnpm deploy:staging     # wrangler deploy --env staging
pnpm deploy:production  # wrangler deploy --env production
```

## Secretos (importante)

`ADMIN_API_KEY` es un **secreto** y NO va en el repositorio ni en `wrangler.toml`. Se setea con
Wrangler secrets por entorno:

```bash
wrangler secret put ADMIN_API_KEY --env staging
wrangler secret put ADMIN_API_KEY --env production
```

En local va en `.dev.vars` (gitignoreado). Ver [`SECURITY.md`](./SECURITY.md).

## Administración

```bash
ADMIN_API_KEY=<tu-key> node admin-config.js get --env=production
ADMIN_API_KEY=<tu-key> node admin-config.js update config-example.json --env=staging
```

## Metodología

Este repo usa una metodología de desarrollo asistido por IA (SDD con spec-kit + memoria persistente +
gates de calidad). Ver [`docs/metodologia.md`](./docs/metodologia.md) y [`CLAUDE.md`](./CLAUDE.md).

## Licencia

MIT — ver [LICENSE](./LICENSE).
