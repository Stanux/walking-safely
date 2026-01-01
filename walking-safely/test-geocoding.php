<?php

require_once 'vendor/autoload.php';

use App\Services\MapAdapters\NominatimAdapter;
use App\Services\MapAdapters\QuotaManager;

// Simular o ambiente Laravel
$_ENV['APP_ENV'] = 'local';

echo "🔍 Testando Nominatim Adapter...\n\n";

try {
    $quotaManager = new QuotaManager();
    $adapter = new NominatimAdapter($quotaManager);
    
    echo "✅ Adapter criado com sucesso\n";
    
    // Teste de health check
    echo "🏥 Testando health check...\n";
    $health = $adapter->healthCheck();
    echo $health ? "✅ Health check OK\n" : "❌ Health check falhou\n";
    
    // Teste de geocoding
    echo "\n🌍 Testando geocoding...\n";
    $addresses = $adapter->geocode('Rua Augusta, São Paulo');
    
    echo "📍 Resultados encontrados: " . count($addresses) . "\n";
    
    foreach ($addresses as $i => $address) {
        echo "  " . ($i + 1) . ". " . $address->formattedAddress . "\n";
        echo "     Coordenadas: {$address->coordinates->latitude}, {$address->coordinates->longitude}\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
    echo "📍 Trace: " . $e->getTraceAsString() . "\n";
}