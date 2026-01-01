#!/usr/bin/env node

/**
 * Script para testar o app sem logs excessivos
 * Executa o app no dispositivo conectado
 */

const { execSync } = require('child_process');

console.log('🚀 Iniciando app sem logs excessivos...');

try {
  // Limpar cache do Metro
  console.log('🧹 Limpando cache...');
  execSync('npx react-native start --reset-cache', { 
    cwd: __dirname,
    stdio: 'inherit' 
  });
} catch (error) {
  console.log('⚠️ Erro ao limpar cache, continuando...');
}

try {
  // Executar app no Android
  console.log('📱 Executando no Android...');
  execSync('npx react-native run-android', { 
    cwd: __dirname,
    stdio: 'inherit' 
  });
} catch (error) {
  console.error('❌ Erro ao executar app:', error.message);
  process.exit(1);
}