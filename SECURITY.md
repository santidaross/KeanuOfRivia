# Seguridad

## Reportar una vulnerabilidad
Abrí un issue privado (Security advisory) o contactá al autor. No publiques detalles explotables en un
issue público antes de que haya un fix.

## Manejo de secretos (regla dura)
- **Ningún secreto vive en el repositorio.** `ADMIN_API_KEY` y cualquier credencial se gestionan como
  **Wrangler secrets**:
  ```bash
  wrangler secret put ADMIN_API_KEY --env staging
  wrangler secret put ADMIN_API_KEY --env production
  ```
- En desarrollo local, los secretos van en `.dev.vars` (gitignoreado). Ver `.dev.vars.example`.
- `wrangler.toml` NO contiene secretos: solo config no sensible (bindings, routes, vars públicas).
- Una key que alguna vez estuvo en el repo se considera **comprometida**: hay que **rotarla** (poner
  una nueva con `wrangler secret put`) además de sacarla del código y del historial.

## API de administración
`POST/DELETE /api/admin/config` exige `Authorization: Bearer <ADMIN_API_KEY>`. La key nunca se
loguea ni se documenta con su valor real. Generá una key fuerte:
```bash
node -e "console.log('API_KEY_' + require('crypto').randomBytes(32).toString('hex'))"
```

## Headers y superficie
Toda respuesta lleva security headers (CSP, HSTS, X-Frame-Options, etc.). La CSP `connect-src` se
mantiene mínima. El endpoint admin valida el input antes de persistir y no se cachea.
