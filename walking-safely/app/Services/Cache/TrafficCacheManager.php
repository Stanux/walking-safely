<?php

namespace App\Services\Cache;

use App\Models\Route;
use App\Services\MapAdapters\TrafficData;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Gerenciador de cache inteligente para dados de trânsito.
 * 
 * Estratégias de otimização:
 * - Cache por segmentos de rota (não rota completa)
 * - TTL dinâmico baseado em horário e condições
 * - Agregação de requisições similares
 * - Cache preditivo para rotas frequentes
 */
class TrafficCacheManager
{
    private const CACHE_PREFIX = 'traffic:';
    private const SEGMENT_SIZE = 5000; // metros por segmento
    
    // TTL em segundos baseado no horário
    private const TTL_RUSH_HOUR = 120;    // 2 minutos no rush
    private const TTL_NORMAL = 300;       // 5 minutos normal
    private const TTL_NIGHT = 900;        // 15 minutos à noite
    private const TTL_WEEKEND = 600;      // 10 minutos fim de semana
    
    // Horários de pico (formato 24h)
    private const RUSH_HOURS = [
        'morning' => ['start' => 7, 'end' => 9],
        'evening' => ['start' => 17, 'end' => 19]
    ];

    /**
     * Busca dados de trânsito com cache inteligente.
     */
    public function getTrafficData(Route $route, callable $apiCallback): TrafficData
    {
        $segments = $this->segmentizeRoute($route);
        $cachedData = [];
        $missingSegments = [];
        
        // Verifica cache para cada segmento
        foreach ($segments as $index => $segment) {
            $cacheKey = $this->generateSegmentKey($segment);
            $cached = Cache::get($cacheKey);
            
            if ($cached && $this->isCacheValid($cached)) {
                $cachedData[$index] = $cached['data'];
                Log::debug("Cache hit para segmento {$index}", ['key' => $cacheKey]);
            } else {
                $missingSegments[$index] = $segment;
            }
        }
        
        // Se todos os segmentos estão em cache, agrega e retorna
        if (empty($missingSegments)) {
            return $this->aggregateSegmentData($cachedData, $route);
        }
        
        // Busca dados faltantes via API
        $apiData = $apiCallback($route);
        
        // Cacheia os novos dados por segmento
        $this->cacheSegmentData($segments, $apiData);
        
        return $apiData;
    }

    /**
     * Divide a rota em segmentos menores para cache granular.
     */
    private function segmentizeRoute(Route $route): array
    {
        $segments = [];
        $coordinates = $route->coordinates;
        $totalDistance = $route->distance;
        
        if ($totalDistance <= self::SEGMENT_SIZE) {
            // Rota pequena, não segmenta
            return [$coordinates];
        }
        
        $segmentCount = ceil($totalDistance / self::SEGMENT_SIZE);
        $pointsPerSegment = ceil(count($coordinates) / $segmentCount);
        
        for ($i = 0; $i < $segmentCount; $i++) {
            $start = $i * $pointsPerSegment;
            $end = min(($i + 1) * $pointsPerSegment, count($coordinates));
            
            $segments[] = array_slice($coordinates, $start, $end - $start);
        }
        
        return $segments;
    }

    /**
     * Gera chave única para segmento baseada em coordenadas.
     */
    private function generateSegmentKey(array $coordinates): string
    {
        // Usa hash das coordenadas para criar chave única
        $coordString = '';
        foreach ($coordinates as $coord) {
            $coordString .= round($coord['lat'], 4) . ',' . round($coord['lng'], 4) . ';';
        }
        
        return self::CACHE_PREFIX . 'segment:' . md5($coordString);
    }

    /**
     * Determina TTL baseado no horário atual.
     */
    private function calculateTTL(): int
    {
        $now = Carbon::now();
        $hour = $now->hour;
        $isWeekend = $now->isWeekend();
        
        if ($isWeekend) {
            return self::TTL_WEEKEND;
        }
        
        // Verifica se está no horário de pico
        foreach (self::RUSH_HOURS as $rush) {
            if ($hour >= $rush['start'] && $hour <= $rush['end']) {
                return self::TTL_RUSH_HOUR;
            }
        }
        
        // Horário noturno (22h às 6h)
        if ($hour >= 22 || $hour <= 6) {
            return self::TTL_NIGHT;
        }
        
        return self::TTL_NORMAL;
    }

    /**
     * Verifica se o cache ainda é válido considerando condições dinâmicas.
     */
    private function isCacheValid(array $cached): bool
    {
        $cachedAt = Carbon::parse($cached['cached_at']);
        $ttl = $this->calculateTTL();
        
        // Cache básico por tempo
        if ($cachedAt->addSeconds($ttl)->isPast()) {
            return false;
        }
        
        // Invalidação inteligente baseada em mudanças de condições
        $currentConditions = $this->getCurrentTrafficConditions();
        $cachedConditions = $cached['conditions'] ?? [];
        
        // Se mudou significativamente as condições, invalida
        if ($this->hasSignificantChange($currentConditions, $cachedConditions)) {
            Log::info('Cache invalidado por mudança de condições', [
                'current' => $currentConditions,
                'cached' => $cachedConditions
            ]);
            return false;
        }
        
        return true;
    }

    /**
     * Cacheia dados de trânsito por segmento.
     */
    private function cacheSegmentData(array $segments, TrafficData $trafficData): void
    {
        $ttl = $this->calculateTTL();
        $conditions = $this->getCurrentTrafficConditions();
        
        foreach ($segments as $index => $segment) {
            $cacheKey = $this->generateSegmentKey($segment);
            
            // Extrai dados específicos do segmento
            $segmentData = $this->extractSegmentTrafficData($trafficData, $index, count($segments));
            
            $cacheData = [
                'data' => $segmentData,
                'cached_at' => Carbon::now()->toISOString(),
                'conditions' => $conditions,
                'ttl' => $ttl
            ];
            
            Cache::put($cacheKey, $cacheData, $ttl);
            
            Log::debug("Dados cacheados para segmento {$index}", [
                'key' => $cacheKey,
                'ttl' => $ttl
            ]);
        }
    }

    /**
     * Agrega dados de múltiplos segmentos em um TrafficData unificado.
     */
    private function aggregateSegmentData(array $segmentData, Route $route): TrafficData
    {
        $totalDuration = 0;
        $totalTypicalDuration = 0;
        $maxDelay = 0;
        $incidents = [];
        
        foreach ($segmentData as $data) {
            $totalDuration += $data['duration'] ?? 0;
            $totalTypicalDuration += $data['typical_duration'] ?? 0;
            $maxDelay = max($maxDelay, $data['delay'] ?? 0);
            
            if (isset($data['incidents'])) {
                $incidents = array_merge($incidents, $data['incidents']);
            }
        }
        
        return TrafficData::fromArray([
            'current_duration' => $totalDuration,
            'typical_duration' => $totalTypicalDuration,
            'delay' => $maxDelay,
            'incidents' => $incidents,
            'cached' => true
        ]);
    }

    /**
     * Extrai dados de trânsito específicos para um segmento.
     */
    private function extractSegmentTrafficData(TrafficData $fullData, int $segmentIndex, int $totalSegments): array
    {
        // Distribui proporcionalmente os dados entre segmentos
        $proportion = 1 / $totalSegments;
        
        return [
            'duration' => ($fullData->current_duration ?? 0) * $proportion,
            'typical_duration' => ($fullData->typical_duration ?? 0) * $proportion,
            'delay' => $fullData->delay ?? 0, // Delay é mantido igual para todos
            'incidents' => $fullData->incidents ?? [],
            'segment_index' => $segmentIndex
        ];
    }

    /**
     * Obtém condições atuais de trânsito para comparação.
     */
    private function getCurrentTrafficConditions(): array
    {
        $now = Carbon::now();
        
        return [
            'hour' => $now->hour,
            'day_of_week' => $now->dayOfWeek,
            'is_weekend' => $now->isWeekend(),
            'is_rush_hour' => $this->isRushHour($now->hour),
            'weather_condition' => $this->getWeatherCondition() // Implementar se necessário
        ];
    }

    /**
     * Verifica se houve mudança significativa nas condições.
     */
    private function hasSignificantChange(array $current, array $cached): bool
    {
        // Mudança de horário de pico
        if ($current['is_rush_hour'] !== ($cached['is_rush_hour'] ?? false)) {
            return true;
        }
        
        // Mudança de dia da semana (weekday <-> weekend)
        if ($current['is_weekend'] !== ($cached['is_weekend'] ?? false)) {
            return true;
        }
        
        // Mudança significativa de horário (mais de 2 horas)
        $hourDiff = abs($current['hour'] - ($cached['hour'] ?? 0));
        if ($hourDiff > 2) {
            return true;
        }
        
        return false;
    }

    /**
     * Verifica se está em horário de pico.
     */
    private function isRushHour(int $hour): bool
    {
        foreach (self::RUSH_HOURS as $rush) {
            if ($hour >= $rush['start'] && $hour <= $rush['end']) {
                return true;
            }
        }
        return false;
    }

    /**
     * Placeholder para condições meteorológicas.
     */
    private function getWeatherCondition(): string
    {
        // Implementar integração com API de clima se necessário
        return 'unknown';
    }

    /**
     * Limpa cache expirado e otimiza armazenamento.
     */
    public function cleanupExpiredCache(): int
    {
        $pattern = self::CACHE_PREFIX . '*';
        $keys = Cache::getRedis()->keys($pattern);
        $cleaned = 0;
        
        foreach ($keys as $key) {
            $data = Cache::get($key);
            if (!$data || !$this->isCacheValid($data)) {
                Cache::forget($key);
                $cleaned++;
            }
        }
        
        Log::info("Cache cleanup concluído", ['keys_removed' => $cleaned]);
        return $cleaned;
    }

    /**
     * Estatísticas de uso do cache.
     */
    public function getCacheStats(): array
    {
        $pattern = self::CACHE_PREFIX . '*';
        $keys = Cache::getRedis()->keys($pattern);
        
        $stats = [
            'total_keys' => count($keys),
            'valid_keys' => 0,
            'expired_keys' => 0,
            'memory_usage' => 0
        ];
        
        foreach ($keys as $key) {
            $data = Cache::get($key);
            if ($data && $this->isCacheValid($data)) {
                $stats['valid_keys']++;
            } else {
                $stats['expired_keys']++;
            }
            
            $stats['memory_usage'] += strlen(serialize($data));
        }
        
        return $stats;
    }
}