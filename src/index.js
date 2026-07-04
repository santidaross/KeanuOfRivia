export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Headers de seguridad y optimización
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.mcstatus.io;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'public, max-age=3600'
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

async function handleAdminConfig(request, env, ctx) {
  // Verificar autenticación
  const authHeader = request.headers.get('Authorization');
  const apiKey = env.ADMIN_API_KEY;
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== apiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'WWW-Authenticate': 'Bearer'
      }
    });
  }

  // Verificar método HTTP
  if (request.method === 'GET') {
    // Obtener configuración actual
    const configKey = 'site-config';
    const currentConfig = await env.CACHE.get(configKey);
    
    if (currentConfig) {
      return new Response(currentConfig, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'No configuration found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (request.method === 'POST') {
    try {
      const newConfig = await request.json();
      
      // Validar estructura básica
      if (!newConfig.title || !newConfig.links || !Array.isArray(newConfig.links)) {
        return new Response(JSON.stringify({ error: 'Invalid configuration format' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Guardar nueva configuración
      const configKey = 'site-config';
      await env.CACHE.put(configKey, JSON.stringify(newConfig), { expirationTtl: 3600 });
      
      return new Response(JSON.stringify({ success: true, message: 'Configuration updated' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (request.method === 'DELETE') {
    // Eliminar configuración
    const configKey = 'site-config';
    await env.CACHE.delete(configKey);
    
    return new Response(JSON.stringify({ success: true, message: 'Configuration deleted' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Método no soportado
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Allow': 'GET, POST, DELETE'
    }
  });
} 