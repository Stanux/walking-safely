<?php

namespace App\Console\Commands;

use App\Services\Cache\TrafficCacheManager;
use Illuminate\Console\Command;

class CleanupTrafficCache extends Command
{
    protected $signature = 'traffic:cleanup-cache 
                           {--stats : Mostrar estatísticas do cache}
                           {--force : Forçar limpeza mesmo com cache válido}';

    protected $description = 'Limpa cache expirado de dados de trânsito e otimiza armazenamento';

    public function handle(TrafficCacheManager $cacheManager): int
    {
        if ($this->option('stats')) {
            $this->showCacheStats($cacheManager);
            return 0;
        }

        $this->info('Iniciando limpeza do cache de trânsito...');
        
        $cleaned = $cacheManager->cleanupExpiredCache();
        
        $this->info("✅ Cache limpo com sucesso!");
        $this->line("📊 {$cleaned} chaves removidas");
        
        // Mostra estatísticas após limpeza
        $this->newLine();
        $this->showCacheStats($cacheManager);
        
        return 0;
    }

    private function showCacheStats(TrafficCacheManager $cacheManager): void
    {
        $stats = $cacheManager->getCacheStats();
        
        $this->info('📈 Estatísticas do Cache de Trânsito');
        $this->table(
            ['Métrica', 'Valor'],
            [
                ['Total de chaves', $stats['total_keys']],
                ['Chaves válidas', $stats['valid_keys']],
                ['Chaves expiradas', $stats['expired_keys']],
                ['Uso de memória', $this->formatBytes($stats['memory_usage'])],
                ['Taxa de hit', $this->calculateHitRate($stats) . '%']
            ]
        );
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }

    private function calculateHitRate(array $stats): float
    {
        $total = $stats['total_keys'];
        if ($total === 0) return 0;
        
        return round(($stats['valid_keys'] / $total) * 100, 1);
    }
}