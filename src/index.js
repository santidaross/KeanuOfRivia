export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Headers de seguridad. NOTA: Cache-Control NO va acá — se setea por respuesta, porque
    // este objeto se aplica con .set() a TODAS las respuestas (incluidas las de /api/admin y
    // los 401), y un Cache-Control "public" acá cachearía respuestas autenticadas/errores.
    // X-XSS-Protection se deja en 0 (el header legacy puede introducir bugs; la defensa real es CSP).
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.mcstatus.io;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };

    // Manejar rutas de API
    if (path.startsWith('/api/')) {
      const response = await handleAPI(request, env, ctx);
      // Agregar headers de seguridad a respuestas de API
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Servir archivos estáticos
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      
      // Agregar headers de seguridad
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Headers específicos por tipo de archivo
      if (path.endsWith('.css')) {
        response.headers.set('Content-Type', 'text/css');
        response.headers.set('Cache-Control', 'public, max-age=31536000');
      } else if (path.endsWith('.js')) {
        response.headers.set('Content-Type', 'application/javascript');
        response.headers.set('Cache-Control', 'public, max-age=31536000');
      } else if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
        response.headers.set('Cache-Control', 'public, max-age=31536000');
      } else {
        // HTML y demás: cache corto (antes lo forzaba el securityHeaders global).
        response.headers.set('Cache-Control', 'public, max-age=3600');
      }

      return response;
    } else {
      return new Response(
        `Development mode: Static files not available. Use 'wrangler dev --assets' or deploy to test static files.`,
        { 
          status: 200,
          headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            ...securityHeaders
          }
        }
      );
    }
  }
};

async function handleAPI(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // API para estado de Minecraft
  if (path === '/api/mc/status') {
    return handleMinecraftStatus(request, env, ctx);
  }

  // API para configuración del sitio
  if (path === '/api/site-config') {
    return handleSiteConfig(request, env, ctx);
  }

  // API para administrar configuración del sitio
  if (path === '/api/admin/config') {
    return handleAdminConfig(request, env, ctx);
  }

  // API para obtener información del servidor (sin revelar IP)
  if (path === '/api/mc/server-info') {
    return handleServerInfo(request, env, ctx);
  }

  return new Response('Not Found', { status: 404 });
}

async function handleMinecraftStatus(request, env, ctx) {
  const cacheKey = 'minecraft-status';
  
  // Rate limiting básico usando IP del cliente
  const clientIP = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   'unknown';
  
  const rateLimitKey = `rate-limit:${clientIP}`;
  const rateLimitCount = await env.CACHE.get(rateLimitKey);
  
  if (rateLimitCount && parseInt(rateLimitCount) > 10) {
    return new Response(JSON.stringify({ 
      online: false, 
      error: 'Rate limit exceeded' 
    }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }
  
  // Incrementar contador de rate limit
  await env.CACHE.put(rateLimitKey, (parseInt(rateLimitCount || '0') + 1).toString(), { expirationTtl: 60 });
  
  // Intentar obtener del cache
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-RateLimit-Remaining': Math.max(0, 10 - parseInt(rateLimitCount || '0')).toString()
      }
    });
  }

  try {
    // Hacer fetch al API de mcstatus.io con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://api.mcstatus.io/v2/status/java/mc.keanuofrivia.com', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'KeanuOfRivia-Website/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Sanitizar datos para ocultar información sensible
    const sanitizedData = {
      online: data.online,
      players: data.players ? {
        online: data.players.online || 0,
        max: data.players.max || 0
      } : null,
      version: data.version ? {
        name: data.version.name || 'Unknown'
      } : null,
      // No incluir IP, puerto, o información del servidor
      timestamp: Date.now()
    };
    
    // Guardar en cache por 1 minuto
    await env.CACHE.put(cacheKey, JSON.stringify(sanitizedData), { expirationTtl: 60 });
    
    return new Response(JSON.stringify(sanitizedData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-RateLimit-Remaining': Math.max(0, 10 - parseInt(rateLimitCount || '0')).toString()
      }
    });
  } catch (error) {
    console.error('Minecraft status error:', error);
    
    return new Response(JSON.stringify({ 
      online: false, 
      error: 'Server temporarily unavailable',
      timestamp: Date.now()
    }), {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '30'
      }
    });
  }
}

async function handleServerInfo(request, env, ctx) {
  // Endpoint que proporciona información genérica sin revelar detalles del servidor
  const serverInfo = {
    name: 'Keanu Of Rivia Server',
    type: 'Minecraft Java',
    status: 'active',
    features: [
      'Survival',
      'Creative',
      'Multiplayer',
      'Custom Plugins'
    ],
    rules: [
      'Be respectful to other players',
      'No griefing or stealing',
      'Follow server guidelines'
    ],
    contact: {
      website: 'https://keanuofrivia.com',
      discord: 'Available in-game'
    },
    // No incluir IP, puerto, o información técnica específica
    lastUpdated: new Date().toISOString()
  };

  return new Response(JSON.stringify(serverInfo), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

async function handleSiteConfig(request, env, ctx) {
  try {
    // Intentar obtener configuración desde KV
    const configKey = 'site-config';
    const cachedConfig = await env.CACHE.get(configKey);
    
    if (cachedConfig) {
      const config = JSON.parse(cachedConfig);
      return new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5 minutos cache
        }
      });
    }

    // Si no hay datos en KV, usar configuración por defecto
    const defaultConfig = {
      title: 'Keanu Of Rivia',
      description: 'Keanu Of Rivia website',
      links: [
        {
          name: 'Minecraft Server',
          url: 'https://mc.keanuofrivia.com',
          icon: '/images/icons/minecraft.svg',
          type: 'minecraft'
        },
        {
          name: 'Buy Me A Coffee',
          url: 'https://buymeacoffee.com/keanuofrivia',
          icon: '/images/icons/buy-me-a-coffee.svg',
          type: 'coffee'
        },
        {
          name: 'Steam',
          url: 'https://steamcommunity.com/profiles/76561197993066934',
          icon: '/images/icons/steam.svg',
          type: 'steam'
        }
      ],
      theme: {
        default: 'auto',
        options: ['auto', 'light', 'dark']
      }
    };

    // Guardar configuración por defecto en KV
    await env.CACHE.put(configKey, JSON.stringify(defaultConfig), { expirationTtl: 3600 });

    return new Response(JSON.stringify(defaultConfig), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error loading site config:', error);
    
    // Fallback a configuración mínima en caso de error
    const fallbackConfig = {
      title: 'Keanu Of Rivia',
      description: 'Keanu Of Rivia website',
      links: [],
      theme: {
        default: 'auto',
        options: ['auto', 'light', 'dark']
      }
    };

    return new Response(JSON.stringify(fallbackConfig), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Comparación en tiempo constante de dos strings (evita timing attacks al verificar el token).
// Workers no expone crypto.timingSafeEqual: se hashea cada valor a un digest de largo fijo y se
// comparan los bytes con OR acumulado (el tiempo no depende del contenido ni del largo del input).
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b))
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

// --- Validación/saneo del config admin antes de persistir ---
// Defensa contra payloads maliciosos: XSS almacenado (name/icon se renderizan con innerHTML en el
// front), URLs javascript:/data:, y payloads gigantes que abusen de KV.
const CFG_MAX_STR = 200;
const CFG_MAX_URL = 500;
const CFG_MAX_LINKS = 30;

function isSafeUrl(u) {
  if (typeof u !== 'string' || u.length === 0 || u.length > CFG_MAX_URL) return false;
  try {
    const parsed = new URL(u, 'https://keanuofrivia.com');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
function isSafeStr(s, max = CFG_MAX_STR) {
  return typeof s === 'string' && s.length > 0 && s.length <= max;
}
function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return 'config must be an object';
  if (!isSafeStr(cfg.title)) return 'invalid title';
  if (cfg.description != null && !isSafeStr(cfg.description, 500)) return 'invalid description';
  if (!Array.isArray(cfg.links)) return 'links must be an array';
  if (cfg.links.length > CFG_MAX_LINKS) return `too many links (max ${CFG_MAX_LINKS})`;
  for (const link of cfg.links) {
    if (!link || typeof link !== 'object') return 'invalid link entry';
    if (!isSafeStr(link.name)) return 'invalid link name';
    if (!isSafeUrl(link.url)) return 'invalid link url (only http/https, no javascript:/data:)';
    if (link.icon != null && !isSafeStr(link.icon, CFG_MAX_URL)) return 'invalid link icon';
    if (link.type != null && !isSafeStr(link.type, 40)) return 'invalid link type';
  }
  return null; // ok
}

// Respuesta JSON para el endpoint admin: sin CORS abierto y sin cachear (respuesta autenticada).
function adminJson(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

async function handleAdminConfig(request, env, ctx) {
  // Verificar autenticación (comparación en tiempo constante; fail-closed si la key no está seteada).
  const authHeader = request.headers.get('Authorization') || '';
  const apiKey = env.ADMIN_API_KEY;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const authorized = Boolean(apiKey) && token.length > 0 && (await timingSafeEqual(token, apiKey));

  if (!authorized) {
    return adminJson({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });
  }

  const configKey = 'site-config';

  if (request.method === 'GET') {
    const currentConfig = await env.CACHE.get(configKey);
    if (currentConfig) {
      return new Response(currentConfig, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
    return adminJson({ error: 'No configuration found' }, 404);
  }

  if (request.method === 'POST') {
    let newConfig;
    try {
      newConfig = await request.json();
    } catch (error) {
      return adminJson({ error: 'Invalid JSON' }, 400);
    }

    // Validación estricta antes de persistir (bloquea XSS almacenado y payloads abusivos).
    const validationError = validateConfig(newConfig);
    if (validationError) {
      return adminJson({ error: 'Invalid configuration format', detail: validationError }, 400);
    }

    await env.CACHE.put(configKey, JSON.stringify(newConfig), { expirationTtl: 3600 });
    return adminJson({ success: true, message: 'Configuration updated' }, 200);
  }

  if (request.method === 'DELETE') {
    await env.CACHE.delete(configKey);
    return adminJson({ success: true, message: 'Configuration deleted' }, 200);
  }

  return adminJson({ error: 'Method not allowed' }, 405, { 'Allow': 'GET, POST, DELETE' });
} 