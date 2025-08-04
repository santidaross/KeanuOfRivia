#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const SITE_URL = 'https://keanuofrivia-website.santidaross.workers.dev';

console.log('🔍 Iniciando tests de performance y seguridad...\n');

// Test 1: Headers de seguridad
console.log('1️⃣ Testing headers de seguridad...');
try {
  const headers = execSync(`curl -I ${SITE_URL}`, { encoding: 'utf8' });
  console.log('✅ Headers obtenidos:');
  console.log(headers);
  
  // Verificar headers críticos
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options', 
    'X-XSS-Protection',
    'Strict-Transport-Security'
  ];
  
  requiredHeaders.forEach(header => {
    if (headers.includes(header)) {
      console.log(`✅ ${header} presente`);
    } else {
      console.log(`❌ ${header} faltante`);
    }
  });
} catch (error) {
  console.log('❌ Error al obtener headers:', error.message);
}

console.log('\n2️⃣ Testing APIs...');

// Test 2: API Minecraft Status
try {
  const minecraftStatus = execSync(`curl -s ${SITE_URL}/api/minecraft-status`, { encoding: 'utf8' });
  const data = JSON.parse(minecraftStatus);
  console.log('✅ API Minecraft Status:', data.online ? '🟢 Online' : '🔴 Offline');
} catch (error) {
  console.log('❌ Error en API Minecraft Status:', error.message);
}

// Test 3: API Site Config
try {
  const siteConfig = execSync(`curl -s ${SITE_URL}/api/site-config`, { encoding: 'utf8' });
  const config = JSON.parse(siteConfig);
  console.log('✅ API Site Config:', config.title);
} catch (error) {
  console.log('❌ Error en API Site Config:', error.message);
}

console.log('\n3️⃣ Testing de carga...');

// Test 4: Load testing básico
try {
  console.log('Ejecutando test de carga (10 conexiones, 30 segundos)...');
  const loadTest = execSync(`npx autocannon -c 10 -d 30 ${SITE_URL}`, { encoding: 'utf8' });
  console.log('✅ Test de carga completado');
  console.log(loadTest);
} catch (error) {
  console.log('❌ Error en test de carga:', error.message);
}

console.log('\n4️⃣ Testing de SSL...');

// Test 5: SSL Checker
try {
  const sslCheck = execSync(`npx ssl-checker ${SITE_URL.replace('https://', '')}`, { encoding: 'utf8' });
  console.log('✅ SSL Check completado');
  console.log(sslCheck);
} catch (error) {
  console.log('❌ Error en SSL check:', error.message);
}

console.log('\n5️⃣ Lighthouse Performance...');

// Test 6: Lighthouse
try {
  console.log('Ejecutando Lighthouse...');
  execSync(`npx lighthouse ${SITE_URL} --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"`, { stdio: 'inherit' });
  
  if (fs.existsSync('./lighthouse-report.json')) {
    const report = JSON.parse(fs.readFileSync('./lighthouse-report.json', 'utf8'));
    const scores = report.lhr.categories;
    
    console.log('\n📊 Lighthouse Scores:');
    console.log(`Performance: ${Math.round(scores.performance.score * 100)}/100`);
    console.log(`Accessibility: ${Math.round(scores.accessibility.score * 100)}/100`);
    console.log(`Best Practices: ${Math.round(scores['best-practices'].score * 100)}/100`);
    console.log(`SEO: ${Math.round(scores.seo.score * 100)}/100`);
  }
} catch (error) {
  console.log('❌ Error en Lighthouse:', error.message);
}

console.log('\n✅ Tests completados!');
console.log('\n📋 Resumen de recomendaciones:');
console.log('- Verifica que todos los headers de seguridad estén presentes');
console.log('- Optimiza imágenes si el score de performance es bajo');
console.log('- Revisa el reporte completo de Lighthouse en lighthouse-report.json');
console.log('- Considera implementar Service Worker para cache offline'); 