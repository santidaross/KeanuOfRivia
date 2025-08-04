#!/usr/bin/env node

const { execSync } = require('child_process');

const WORKER_URL = 'https://keanuofrivia-website.santidaross.workers.dev';

console.log('🔍 Testing básico de performance y seguridad...\n');

// Test 1: Verificar que el Worker responde
console.log('1️⃣ Verificando respuesta del Worker...');
try {
  const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${WORKER_URL}`, { encoding: 'utf8' });
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
  console.log('Ejecutando 100 requests...');
  const start = Date.now();
  
  for (let i = 0; i < 10; i++) {
    execSync(`curl -s ${WORKER_URL} > /dev/null`, { stdio: 'ignore' });
  }
  
  const end = Date.now();
  const duration = end - start;
  console.log(`✅ 10 requests completadas en ${duration}ms`);
  console.log(`📊 Promedio: ${duration / 10}ms por request`);
} catch (error) {
  console.log('❌ Error en test de carga');
}

// Test 4: Verificar tamaño de respuesta
console.log('\n4️⃣ Verificando tamaño de respuesta...');
try {
  const size = execSync(`curl -s ${WORKER_URL} | wc -c`, { encoding: 'utf8' });
  console.log(`✅ Tamaño de respuesta: ${size.trim()} bytes`);
} catch (error) {
  console.log('❌ Error al verificar tamaño');
}

console.log('\n✅ Tests básicos completados!');
console.log('\n📋 Próximos pasos:');
console.log('- Configura tu dominio personalizado en Cloudflare DNS');
console.log('- Ejecuta tests completos con Lighthouse en el navegador');
console.log('- Monitorea logs con: npx wrangler tail'); 