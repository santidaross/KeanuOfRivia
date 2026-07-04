#!/usr/bin/env node

const fs = require('fs');

/**
 * Script de administración para gestionar la configuración del sitio
 * Uso: node admin-config.js [comando] [opciones]
 * 
 * Entornos:
 * - Local: http://localhost:8787 (desarrollo local)
 * - Staging: https://keanuofrivia-website-staging.santidaross.workers.dev
 * - Production: https://keanuofrivia-website-prod.santidaross.workers.dev
 */

// Detectar entorno desde variable de entorno o argumento
const ENV = process.env.CLOUDFLARE_ENV || process.env.NODE_ENV || 'local';

// Configuración por entorno.
// La API key NO se hardcodea: se lee de la variable de entorno ADMIN_API_KEY.
//   ADMIN_API_KEY=... node admin-config.js get --env=production
const ENVIRONMENTS = {
  local: {
    url: 'http://localhost:8787',
    apiKey: process.env.ADMIN_API_KEY
  },
  staging: {
    url: 'https://keanuofrivia-website-staging.santidaross.workers.dev',
    apiKey: process.env.ADMIN_API_KEY
  },
  production: {
    url: 'https://keanuofrivia-website-prod.santidaross.workers.dev',
    apiKey: process.env.ADMIN_API_KEY
  }
};

// Obtener configuración del entorno actual
function getEnvironmentConfig() {
  // Prioridad: variable de entorno > argumento CLI > local por defecto
  let currentEnv = ENV;
  
  // Verificar si se especificó entorno en argumentos
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  if (envArg) {
    currentEnv = envArg.split('=')[1];
  }
  
  const config = ENVIRONMENTS[currentEnv];
  if (!config) {
    console.error(`❌ Entorno '${currentEnv}' no reconocido. Entornos disponibles: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }
  
  if (!config.apiKey) {
    console.error('❌ Falta ADMIN_API_KEY en el entorno. Definila antes de correr el script:');
    console.error('   ADMIN_API_KEY=tu-key node admin-config.js <comando> --env=' + currentEnv);
    process.exit(1);
  }

  console.log(`🌍 Usando entorno: ${currentEnv.toUpperCase()}`);
  console.log(`📡 URL: ${config.url}`);

  return config;
}

const { url: BASE_URL, apiKey: API_KEY } = getEnvironmentConfig();

async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}/api/admin/config`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function getConfig() {
  console.log('📖 Obteniendo configuración actual...');
  const config = await makeRequest('/api/admin/config', 'GET');
  console.log('✅ Configuración actual:');
  console.log(JSON.stringify(config, null, 2));
}

async function updateConfig(configFile) {
  console.log(`📝 Actualizando configuración desde ${configFile}...`);
  
  let config;
  try {
    const fileContent = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error al cargar archivo ${configFile}:`, error.message);
    process.exit(1);
  }
  
  const result = await makeRequest('/api/admin/config', 'POST', config);
  console.log('✅ Configuración actualizada:', result.message);
}

async function deleteConfig() {
  console.log('🗑️  Eliminando configuración...');
  const result = await makeRequest('/api/admin/config', 'DELETE');
  console.log('✅ Configuración eliminada:', result.message);
}

async function showStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/site-config`);
    const config = await response.json();
    
    console.log('📊 Estado del sitio:');
    console.log(`   Título: ${config.title}`);
    console.log(`   Enlaces: ${config.links.length}`);
    console.log(`   Tema: ${config.theme.default}`);
    
    // Verificar Minecraft status
    const mcResponse = await fetch(`${BASE_URL}/api/mc/status`);
    const mcStatus = await mcResponse.json();
    console.log(`   Minecraft: ${mcStatus.online ? '🟢 Online' : '🔴 Offline'}`);
    if (mcStatus.players) {
      console.log(`   Jugadores: ${mcStatus.players.online}/${mcStatus.players.max}`);
    }
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error.message);
  }
}

function showHelp() {
  console.log(`
🛠️  Script de Administración - Keanu Of Rivia Website

Uso: node admin-config.js [comando] [opciones]

📋 Comandos:
  get                    Obtener configuración actual
  update <archivo.json>  Actualizar configuración desde archivo JSON
  delete                 Eliminar configuración actual
  status                 Mostrar estado del sitio
  help                   Mostrar esta ayuda

🌍 Entornos:
  --env=local           Desarrollo local (http://localhost:8787)
  --env=staging         Staging en Cloudflare Workers
  --env=production      Producción en Cloudflare Workers

📚 Ejemplos:
  node admin-config.js get
  node admin-config.js update config-example.json --env=staging
  node admin-config.js delete --env=production
  node admin-config.js status --env=local

🔑 Variables de Entorno:
  CLOUDFLARE_ENV        Define el entorno (local|staging|production)
  NODE_ENV              Fallback para el entorno

📝 Formato del archivo JSON:
{
  "title": "Keanu Of Rivia",
  "description": "Keanu Of Rivia website",
  "links": [
    {
      "name": "Minecraft Server",
      "url": "https://mc.keanuofrivia.com",
      "icon": "/images/icons/minecraft.svg",
      "type": "minecraft"
    }
  ],
  "theme": {
    "default": "auto",
    "options": ["auto", "light", "dark"]
  }
}
`);
}

// Procesar argumentos de línea de comandos
const command = process.argv[2];

switch (command) {
  case 'get':
    getConfig();
    break;
  case 'update':
    const configFile = process.argv[3];
    if (!configFile) {
      console.error('❌ Error: Debe especificar un archivo de configuración');
      process.exit(1);
    }
    updateConfig(configFile);
    break;
  case 'delete':
    deleteConfig();
    break;
  case 'status':
    showStatus();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error('❌ Comando no reconocido. Use "help" para ver opciones disponibles.');
    process.exit(1);
} 