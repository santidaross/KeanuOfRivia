# Keanu Of Rivia Website

Sitio web personal de Keanu Of Rivia construido con Cloudflare Workers.

## 🚀 Características

- **Arquitectura híbrida**: Frontend estático + APIs del servidor
- **Cache inteligente**: KV Storage para optimizar rendimiento
- **Protección de IP**: Proxy seguro para APIs externas
- **Rate limiting**: Protección contra abuso
- **Temas dinámicos**: Sistema de temas claro/oscuro/auto
- **Estado en tiempo real**: Estado del servidor de Minecraft

## 🏗️ Arquitectura

El sitio utiliza una arquitectura moderna:

- **Frontend**: HTML estático servido desde Cloudflare Workers
- **Backend**: APIs del servidor para funcionalidad dinámica
- **Cache**: KV Storage para optimizar rendimiento
- **CDN**: Cloudflare Edge Network para distribución global

## 🔧 APIs Disponibles

- `/api/minecraft-status` - Estado del servidor de Minecraft con cache
- `/api/site-config` - Configuración dinámica del sitio
- `/api/server-info` - Información genérica del servidor

## 🛡️ Seguridad

- **Rate limiting**: Máximo 10 requests/minuto por IP
- **Sanitización de datos**: Información sensible filtrada
- **Timeouts**: Protección contra requests colgados
- **Cache del servidor**: Reduce exposición a APIs externas

## 🚀 Desarrollo

### Prerrequisitos

- Node.js 18+
- Wrangler CLI
- Cuenta de Cloudflare

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/keanuofrivia-website.git
cd keanuofrivia-website

# Instalar dependencias
npm install

# Configurar Wrangler (primera vez)
npx wrangler login
```

### Desarrollo Local

```bash
# Ejecutar con assets
npx wrangler dev --assets ./public

# O sin assets (solo APIs)
npx wrangler dev
```

### Deploy

```bash
# Deploy a producción
npx wrangler deploy

# Deploy a staging
npx wrangler deploy --env staging
```

## 📁 Estructura del Proyecto

```
KeanuOfRivia/
├── src/
│   └── index.js          # Worker principal
├── public/
│   ├── index.html        # Página principal
│   ├── css/              # Estilos
│   ├── images/           # Imágenes e iconos
│   └── fonts/            # Fuentes
├── wrangler.toml         # Configuración de Wrangler
├── package.json          # Dependencias
└── README.md            # Documentación
```

## 🔧 Configuración

### Variables de Entorno

El archivo `wrangler.toml` contiene:
- Configuración del Worker
- Namespaces KV para cache
- Entornos de staging y producción

### KV Namespaces

```bash
# Crear namespace de producción
npx wrangler kv namespace create "cache-namespace"

# Crear namespace de preview
npx wrangler kv namespace create "cache-namespace-preview" --preview
```

## 📊 Rendimiento

- **Tiempo de respuesta**: < 100ms (cache)
- **Uptime**: 99.9% (Cloudflare Edge)
- **CDN**: Distribución global
- **Cache**: KV Storage para APIs

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👤 Autor

**Keanu Of Rivia**
- Website: [keanuofrivia.com](https://keanuofrivia.com)
- Minecraft: [mc.keanuofrivia.com](https://mc.keanuofrivia.com)

## 🙏 Agradecimientos

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [LittleLink](https://github.com/jeffreyroberts/littlelink) - Inspiración del diseño
- [mcstatus.io](https://mcstatus.io/) - API de estado de Minecraft