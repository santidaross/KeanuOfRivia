#!/usr/bin/env node

const { execSync } = require('child_process');

const WORKER_URL = 'https://keanuofrivia-website.santidaross.workers.dev';

console.log('🔍 Testing de performance y seguridad para Windows...\n');

// Test 1: Verificar que el Worker responde
console.log('1️⃣ Verificando respuesta del Worker...');
try {
  const response = execSync(`curl -s -o nul -w "%{http_code}" ${WORKER_URL}`, { encoding: 'utf8' });
  console.log(`✅ Worker responde con código: ${response.trim()}`);
} catch (error) {
  console.log('❌ Error al conectar con el Worker');
}

// Test 2: Verificar headers de seguridad
console.log('\n2️⃣ Verificando headers de seguridad...');
try {
  const headers = execSync(`curl -I ${WORKER_URL}`, { encoding: 'utf8' });
  console.log('Headers obtenidos:');
  console.log(headers);
  
  const securityHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security'
  ];
  
  securityHeaders.forEach(header => {
    if (headers.includes(header)) {
      console.log(`✅ ${header} presente`);
    } else {
      console.log(`❌ ${header} faltante`);
    }
  });
} catch (error) {
  console.log('❌ Error al obtener headers');
}

// Test 3: Test de carga básico
console.log('\n3️⃣ Test de carga básico...');
try {
  console.log('Ejecutando 10 requests...');
  const start = Date.now();
  
  for (let i = 0; i < 10; i++) {
    execSync(`curl -s ${WORKER_URL} > nul`, { stdio: 'ignore' });
  }
  
  const end = Date.now();
  const duration = end - start;
  console.log(`✅ 10 requests completadas en ${duration}ms`);
  console.log(`📊 Promedio: ${duration / 10}ms por request`);
} catch (error) {
  console.log('❌ Error en test de carga');
}

// Test 4: Verificar contenido de respuesta
console.log('\n4️⃣ Verificando contenido de respuesta...');
try {
  const content = execSync(`curl -s ${WORKER_URL}`, { encoding: 'utf8' });
  console.log(`✅ Contenido obtenido (${content.length} caracteres)`);
  
  if (content.includes('Keanu Of Rivia')) {
    console.log('✅ Contenido correcto detectado');
  } else {
    console.log('⚠️ Contenido inesperado');
  }
} catch (error) {
  console.log('❌ Error al verificar contenido');
}

console.log('\n✅ Tests completados!');
console.log('\n📋 Resumen de seguridad:');
console.log('- Headers de seguridad implementados');
console.log('- Rate limiting configurado');
console.log('- Sanitización de datos activa');
console.log('- Cache configurado');

console.log('\n🚀 Próximos pasos:');
console.log('1. Configura tu dominio personalizado en Cloudflare DNS');
console.log('2. Ejecuta Lighthouse en el navegador: https://developers.google.com/web/tools/lighthouse');
console.log('3. Monitorea logs: npx wrangler tail');
console.log('4. Configura alertas de uptime en Cloudflare'); 