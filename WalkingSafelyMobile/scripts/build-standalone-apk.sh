#!/bin/bash

# Script para gerar APK standalone completo
# Uso: ./scripts/build-standalone-apk.sh

echo "🚀 Gerando APK standalone do Walking Safely..."

# Verifica se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto mobile"
    exit 1
fi

# Passo 1: Criar diretório assets se não existir
echo "📁 Criando diretório assets..."
mkdir -p android/app/src/main/assets

# Passo 2: Gerar bundle JavaScript
echo "📦 Gerando bundle JavaScript..."
npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

if [ $? -ne 0 ]; then
    echo "❌ Erro ao gerar bundle JavaScript"
    exit 1
fi

echo "✅ Bundle JavaScript gerado com sucesso"

# Passo 3: Limpar build anterior
echo "🧹 Limpando build anterior..."
cd android
./gradlew clean

# Passo 4: Gerar APK
echo "🔨 Gerando APK..."
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "❌ Erro ao gerar APK"
    exit 1
fi

cd ..

# Verificar se APK foi gerado
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "✅ APK gerado com sucesso!"
    echo "📱 Localização: $APK_PATH"
    echo "📊 Tamanho: $APK_SIZE"
    echo ""
    echo "🌐 Configurado para backend: http://50.21.181.92:8080/api"
    echo ""
    echo "📲 Para instalar:"
    echo "   npm run install-apk"
    echo "   ou"
    echo "   adb install -r $APK_PATH"
else
    echo "❌ APK não foi gerado"
    exit 1
fi