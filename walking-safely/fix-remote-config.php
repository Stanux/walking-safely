<?php

echo "🔧 Verificando configuração do servidor remoto...\n\n";

// Verificar configuração atual
echo "📋 Configuração atual:\n";
echo "MAP_PROVIDER: " . env('MAP_PROVIDER', 'not set') . "\n";
echo "GOOGLE_MAPS_API_KEY: " . (env('GOOGLE_MAPS_API_KEY') ? 'SET' : 'NOT SET') . "\n";
echo "HERE_MAPS_API_KEY: " . (env('HERE_MAPS_API_KEY') ? 'SET' : 'NOT SET') . "\n";

echo "\n📋 Config cache:\n";
echo "services.map_provider: " . config('services.map_provider') . "\n";
echo "services.google_maps.api_key: " . (config('services.google_maps.api_key') ? 'SET' : 'NOT SET') . "\n";

echo "\n🔄 Limpando cache...\n";
system('php artisan config:clear');
system('php artisan cache:clear');

echo "\n✅ Cache limpo. Verificando novamente...\n";
echo "services.map_provider: " . config('services.map_provider') . "\n";

echo "\n🧪 Testando adapter...\n";
try {
    $factory = app(\App\Services\MapAdapters\MapAdapterFactory::class);
    $adapter = $factory->getConfiguredAdapter();
    echo "Provider configurado: " . $adapter->getProviderName() . "\n";
    echo "Provider disponível: " . ($adapter->isAvailable() ? 'SIM' : 'NÃO') . "\n";
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}