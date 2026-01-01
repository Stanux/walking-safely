#!/bin/bash

# Script para instalar o APK gerado
# Uso: ./scripts/install-apk.sh

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

echo "📱 Instalando Walking Safely APK..."

# Verifica se o APK existe
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK não encontrado em $APK_PATH"
    echo "💡 Execute primeiro: npm run build-apk"
    exit 1
fi

# Verifica se há dispositivos conectados
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ Nenhum dispositivo Android conectado"
    echo "💡 Conecte um dispositivo via USB ou WiFi"
    echo "💡 Para WiFi: adb connect <IP_DO_DISPOSITIVO>:5555"
    exit 1
fi

echo "📋 Dispositivos conectados:"
adb devices

echo ""
echo "🚀 Instalando APK..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo "✅ APK instalado com sucesso!"
    echo "📱 Procure por 'WalkingSafelyMobile' no seu dispositivo"
    echo ""
    echo "🌐 Configurado para usar backend: http://50.21.181.92:8080/api"
    echo ""
    echo "💡 Para debug: adb logcat | grep -i 'WalkingSafely\|ReactNative'"
else
    echo "❌ Erro ao instalar APK"
    echo "💡 Tente: adb uninstall com.walkingsafelymobile"
    echo "💡 E execute novamente este script"
fi