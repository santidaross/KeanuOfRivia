# 🚀 Guía de Deployment - Múltiples Entornos

Este proyecto está configurado con **tres entornos** para un flujo de desarrollo completo:

## 🌍 **Entornos Disponibles**

### 1. **Local Development** 🏠
- **URL:** `http://localhost:8787`
- **Propósito:** Desarrollo local con hot reload
- **Secret:** `ADMIN_API_KEY` en `.dev.vars` (gitignoreado)
- **KV:** Namespace local simulado

### 2. **Staging** 🧪
- **URL:** `https://keanuofrivia-website-staging.santidaross.workers.dev`
- **Propósito:** Testing de features antes de producción (UAT)
- **Secret:** `wrangler secret put ADMIN_API_KEY --env staging`
- **KV:** Namespace compartido con producción
- **Deploy:** Automático en push a `main` (CI)

### 3. **Production** 🌐
- **URL:** `https://keanuofrivia-website.santidaross.workers.dev`
- **Propósito:** Sitio en vivo para usuarios finales
- **Secret:** `wrangler secret put ADMIN_API_KEY --env production`
- **KV:** Namespace de producción
- **Deploy:** Manual (workflow_dispatch) tras validar staging

## 🛠️ **Comandos de Desarrollo**

### Desarrollo Local
```bash
# Iniciar servidor de desarrollo local (http://localhost:8787)
pnpm dev

# Probar con la config de staging
pnpm dev:staging
```

### Deployment Manual
```bash
# Deploy a staging
pnpm deploy:staging
wrangler deploy --env staging

# Deploy a production
pnpm deploy:production
wrangler deploy --env production
```

### Monitoreo
```bash
# Ver logs en tiempo real
pnpm tail                    # Local/Default
pnpm tail:staging           # Staging
pnpm tail:production        # Production
```

## 🔧 **Administración por Entorno**

### Script de Admin
```bash
# Local (por defecto)
node admin-config.js get
node admin-config.js status

# Staging
node admin-config.js get --env=staging
node admin-config.js update config-example.json --env=staging

# Production
node admin-config.js get --env=production
node admin-config.js delete --env=production
```

### Variables de Entorno
```bash
# Configurar entorno por defecto
export CLOUDFLARE_ENV=staging
node admin-config.js get

# O usar NODE_ENV
export NODE_ENV=production
node admin-config.js status
```

## 🚦 **Flujo de Trabajo (Git Flow)**

### 1. **Desarrollo Local**
```bash
git checkout -b feature/nueva-funcionalidad
# Desarrollo local en http://localhost:8787
pnpm dev
```

### 2. **Testing en Staging**
```bash
git push origin feature/nueva-funcionalidad
# Crear Pull Request → Deploy automático a staging
# Probar en: https://keanuofrivia-website-staging.santidaross.workers.dev
```

### 3. **Release a Producción**
```bash
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
# Deploy automático a production
# Vivo en: https://keanuofrivia-website-prod.santidaross.workers.dev
```

## 🤖 **CI/CD Automático (GitHub Actions)**

### Triggers
- **Staging:** Automático en rama `develop` y Pull Requests
- **Production:** Automático en rama `main/master`

### Configuración Requerida
En GitHub Settings → Secrets and variables → Actions:

```bash
CLOUDFLARE_API_TOKEN=tu_api_token_aqui
CLOUDFLARE_ACCOUNT_ID=tu_account_id_aqui
```

### Workflow
1. ✅ Checkout código
2. ✅ Setup Node.js 18
3. ✅ Install dependencies
4. ✅ Deploy según rama
5. ✅ Comentar en PR con URL de staging
6. ✅ Notificar deployment exitoso

## 🔑 **Gestión de API Keys (secrets)**

`ADMIN_API_KEY` es un **secreto**: NO va en `wrangler.toml` ni en el repo. Se gestiona con Wrangler
secrets por entorno.

```bash
# Setear el secret por entorno (Cloudflare lo guarda cifrado)
wrangler secret put ADMIN_API_KEY --env staging
wrangler secret put ADMIN_API_KEY --env production

# En desarrollo local va en .dev.vars (gitignoreado):
#   ADMIN_API_KEY=una-key-de-dev
```

### Rotación de Keys
```bash
# Generar una key fuerte
node -e "console.log('API_KEY_' + require('crypto').randomBytes(32).toString('hex'))"

# Poner la nueva con `wrangler secret put ADMIN_API_KEY --env <entorno>` (no requiere redeploy).
# Una key que alguna vez estuvo en el repo se considera comprometida: hay que rotarla.
```

## 📊 **Monitoreo y Testing**

### Health Checks
```bash
# Verificar estado de todos los entornos
node admin-config.js status --env=local
node admin-config.js status --env=staging
node admin-config.js status --env=production
```

### URLs de Testing
```bash
# APIs públicas
curl https://keanuofrivia-website-staging.santidaross.workers.dev/api/site-config
curl https://keanuofrivia-website-prod.santidaross.workers.dev/api/mc/status

# APIs protegidas (requieren API key)
curl -H "Authorization: Bearer YOUR_STAGING_API_KEY" \
     https://keanuofrivia-website-staging.santidaross.workers.dev/api/admin/config
```

## 🐛 **Troubleshooting**

### Problemas Comunes

**Error: Namespace no encontrado**
```bash
# Verificar configuración de KV en Cloudflare dashboard
# Actualizar IDs en wrangler.toml
```

**Error: API key incorrecta**
```bash
# Verificar que la API key coincida entre wrangler.toml y admin script
# Regenerar API key si es necesario
```

**Error: Deploy fallido**
```bash
# Verificar secrets en GitHub
# Verificar permisos de API token en Cloudflare
```

### Logs Útiles
```bash
# Ver logs detallados durante deploy
wrangler deploy --env staging --verbose

# Monitorear requests en tiempo real
wrangler tail --env production --format pretty
```

## 📝 **Checklist Pre-Deployment**

### Antes de Merge a Main
- [ ] ✅ Testear en staging
- [ ] ✅ Verificar APIs funcionando
- [ ] ✅ Probar admin script
- [ ] ✅ Confirmar performance
- [ ] ✅ Revisar logs por errores

### Post-Deployment
- [ ] ✅ Verificar sitio en vivo
- [ ] ✅ Testear Minecraft status
- [ ] ✅ Verificar configuración admin
- [ ] ✅ Monitorear logs por 15 min

## 🎯 **Próximos Pasos**

1. **Métricas:** Agregar monitoring con Cloudflare Analytics
2. **Alertas:** Configurar notificaciones de errores
3. **Testing:** Implementar tests automatizados
4. **CDN:** Optimizar assets con Cloudflare CDN
5. **Security:** Agregar rate limiting más granular

---

**¡Entornos configurados y listos para uso!** 🚀 