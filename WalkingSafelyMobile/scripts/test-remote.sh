#!/bin/bash

# Script para testar o app com backend remoto
# Uso: ./scripts/test-remote.sh

echo "🚀 Configurando app para backend remoto..."

# Verifica se o backend está acessível
echo "📡 Testando conectividade com o backend..."
if curl -s --connect-timeout 5 http://50.21.181.92:8080/api/ | grep -q "Walking Safely API"; then
    echo "✅ Backend acessível em http://50.21.181.92:8080/api"
else
    echo "❌ Backend não acessível. Verifique se o servidor está rodando."
    exit 1
fi

# Limpa cache do Metro
echo "🧹 Limpando cache do Metro..."
npx react-native start --reset-cache &

# Aguarda alguns segundos para o Metro iniciar
sleep 5

# Constrói e instala o app no dispositivo/emulador
echo "📱 Construindo e instalando o app..."
npx react-native run-android --variant=debug

echo "✅ App configurado para usar backend remoto!"
echo "🌐 API Base URL: http://50.21.181.92:8080/api"
echo ""
echo "💡 Dicas:"
echo "- Certifique-se que seu dispositivo está na mesma rede ou tem acesso à internet"
echo "- Se houver problemas de conectividade, verifique firewall/proxy"
echo "- Para debug, use: npx react-native log-android"