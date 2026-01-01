<?php

echo "🔧 Limpando OPcache...\n";

if (function_exists('opcache_reset')) {
    if (opcache_reset()) {
        echo "✅ OPcache limpo com sucesso!\n";
    } else {
        echo "❌ Falha ao limpar OPcache\n";
    }
} else {
    echo "⚠️ OPcache não está disponível\n";
}

echo "\n📊 Status do OPcache:\n";
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status();
    echo "Habilitado: " . ($status['opcache_enabled'] ? 'SIM' : 'NÃO') . "\n";
    echo "Cache cheio: " . ($status['cache_full'] ? 'SIM' : 'NÃO') . "\n";
    echo "Arquivos em cache: " . $status['opcache_statistics']['num_cached_scripts'] . "\n";
} else {
    echo "Status não disponível\n";
}

echo "\n🔄 Limpando cache do Laravel...\n";
system('php artisan optimize:clear');

echo "\n✅ Processo concluído!\n";