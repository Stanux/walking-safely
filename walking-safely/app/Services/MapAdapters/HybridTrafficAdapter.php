<?php

namespace App\Services\MapAdapters;

use App\Models\Route;
use App\Services\Cache\TrafficCacheManager;
use App\Services\MapAdapters\Contracts\MapAdapterInterface;
use Illuminate\Support\Facades\Log;

/**
 * Adapter híbrido que combina Nominatim (geocoding) com APIs pagas (traffic).
 * 
 * Estratégia:
 * - Nominatim para geocodificação (gratuito)
 * - Google/HERE apenas para dados de trânsito (com cache agressivo)
 * - Fallback inteligente entre provedores
 */
class HybridTrafficAdapter implements MapAdapterInterface
{
    private NominatimAdapter $nominatimAdapter;
    private MapAdapterInterface $trafficAdapter;
    private TrafficCacheManager $cacheManager;
    private array $config;

    public function __construct(
        NominatimAdapter $nominatimAdapter,
        MapAdapterInterface $trafficAdapter,
        TrafficCacheManager $cacheManager,
        array $config = []
    ) {
        $this->nominatimAdapter = $nominatimAdapter;
        $this->trafficAdapter = $trafficAdapter;
        $this->cacheManager = $cacheManager;
        $this->config = array_merge([
            'max_traffic_requests_per_hour' => 100,
            'fallback_to_estimated' => true,
            'cache_hit_ratio_threshold' => 0.7
        ], $config);
    }

    /**
     * {@inheritdoc}
     * Usa Nominatim para geocodificação.
     */
    public function geocode(string $address): array
    {
        return $this->nominatimAdapter->geocode($address);
    }

    /**
     * {@inheritdoc}
     * Usa Nominatim para geocodificação reversa.
     */
    public function reverseGeocode(float $lat, float $lng): ?Address
    {
        return $this->nominatimAdapter->reverseGeocode($lat, $lng);
    }

    /**
     * {@inheritdoc}
     * Usa Nominatim para roteamento básico.
     */
    public function getRoute(array $waypoints, array $options = []): Route
    {
        return $this->nominatimAdapter->getRoute($waypoints, $options);
    }

    /**
     * {@inheritdoc}
     * Usa API paga com cache inteligente para dados de trânsito.
     */
    public function getTrafficData(Route $route): TrafficData
    {
        // Verifica se deve usar API paga baseado em quotas e cache hit ratio
        if (!$this->shouldUseTrafficAPI()) {
            Log::info('Usando dados estimados devido a limites de quota');
            return $this->getEstimatedTrafficData($route);
        }

        return $this->cacheManager->getTrafficData($route, function(Route $route) {
            try {
                Log::info('Fazendo requisição à API de trânsito', [
                    'provider' => get_class($this->trafficAdapter),
                    'route_distance' => $route->distance
                ]);
                
                $this->incrementTrafficAPIUsage();
                return $this->trafficAdapter->getTrafficData($route);
                
            } catch (\Exception $e) {
                Log::warning('Erro na API de trânsito, usando dados estimados', [
                    'error' => $e->getMessage(),
                    'provider' => get_class($this->trafficAdapter)
                ]);
                
                if ($this->config['fallback_to_estimated']) {
                    return $this->getEstimatedTrafficData($route);
                }
                
                throw $e;
            }
        });
    }

    /**
     * Gera dados de trânsito estimados baseados em padrões históricos.
     */
    private function getEstimatedTrafficData(Route $route): TrafficData
    {
        $baseTime = $route->duration;
        $currentHour = now()->hour;
        $isWeekend = now()->isWeekend();
        
        // Fatores de multiplicação baseados em horário
        $trafficMultiplier = $this->getTrafficMultiplier($currentHour, $isWeekend);
        
        $estimatedDuration = $baseTime * $trafficMultiplier;
        $delay = max(0, $estimatedDuration - $baseTime);
        
        return TrafficData::fromArray([
            'current_duration' => $estimatedDuration,
            'typical_duration' => $baseTime,
            'delay' => $delay,
            'incidents' => [],
            'estimated' => true,
            'confidence' => $this->calculateEstimateConfidence($currentHour, $isWeekend)
        ]);
    }

    /**
     * Calcula multiplicador de trânsito baseado em padrões históricos.
     */
    private function getTrafficMultiplier(int $hour, bool $isWeekend): float
    {
        if ($isWeekend) {
            // Fim de semana: trânsito mais leve
            if ($hour >= 10 && $hour <= 14) {
                return 1.2; // Almoço/compras
            }
            return 1.0;
        }
        
        // Dias úteis
        $multipliers = [
            // 0-6h: madrugada
            0 => 0.8, 1 => 0.8, 2 => 0.8, 3 => 0.8, 4 => 0.8, 5 => 0.8, 6 => 0.9,
            // 7-9h: pico manhã
            7 => 1.4, 8 => 1.6, 9 => 1.3,
            // 10-16h: normal
            10 => 1.1, 11 => 1.1, 12 => 1.2, 13 => 1.2, 14 => 1.1, 15 => 1.1, 16 => 1.2,
            // 17-19h: pico tarde
            17 => 1.5, 18 => 1.7, 19 => 1.4,
            // 20-23h: noite
            20 => 1.2, 21 => 1.1, 22 => 1.0, 23 => 0.9
        ];
        
        return $multipliers[$hour] ?? 1.0;
    }

    /**
     * Calcula confiança da estimativa (0-1).
     */
    private function calculateEstimateConfidence(int $hour, bool $isWeekend): float
    {
        // Maior confiança em horários com padrões mais previsíveis
        if ($isWeekend) {
            return 0.7; // Fim de semana é mais previsível
        }
        
        // Horários de pico têm padrões mais consistentes
        if (($hour >= 7 && $hour <= 9) || ($hour >= 17 && $hour <= 19)) {
            return 0.8;
        }
        
        // Madrugada é muito previsível
        if ($hour >= 0 && $hour <= 6) {
            return 0.9;
        }
        
        return 0.6; // Outros horários
    }

    /**
     * Verifica se deve usar API paga baseado em quotas e performance.
     */
    private function shouldUseTrafficAPI(): bool
    {
        $usage = $this->getTrafficAPIUsage();
        $maxPerHour = $this->config['max_traffic_requests_per_hour'];
        
        // Verifica quota horária
        if ($usage['current_hour'] >= $maxPerHour) {
            return false;
        }
        
        // Verifica cache hit ratio
        $cacheStats = $this->cacheManager->getCacheStats();
        $hitRatio = $cacheStats['valid_keys'] / max(1, $cacheStats['total_keys']);
        
        if ($hitRatio < $this->config['cache_hit_ratio_threshold']) {
            // Cache hit ratio baixo, usar API para melhorar cache
            return true;
        }
        
        // Usa API apenas para rotas importantes ou em horários críticos
        return $this->isHighPriorityTime();
    }

    /**
     * Verifica se é horário de alta prioridade para dados de trânsito.
     */
    private function isHighPriorityTime(): bool
    {
        $hour = now()->hour;
        $isWeekend = now()->isWeekend();
        
        if ($isWeekend) {
            return false; // Fim de semana não é prioridade
        }
        
        // Horários de pico são alta prioridade
        return ($hour >= 7 && $hour <= 9) || ($hour >= 17 && $hour <= 19);
    }

    /**
     * Incrementa contador de uso da API de trânsito.
     */
    private function incrementTrafficAPIUsage(): void
    {
        $key = 'traffic_api_usage:' . now()->format('Y-m-d-H');
        $current = cache()->get($key, 0);
        cache()->put($key, $current + 1, 3600); // TTL de 1 hora
    }

    /**
     * Obtém estatísticas de uso da API de trânsito.
     */
    private function getTrafficAPIUsage(): array
    {
        $currentHour = 'traffic_api_usage:' . now()->format('Y-m-d-H');
        $today = 'traffic_api_usage:' . now()->format('Y-m-d');
        
        return [
            'current_hour' => cache()->get($currentHour, 0),
            'today' => $this->getTodayUsage(),
            'limit_per_hour' => $this->config['max_traffic_requests_per_hour']
        ];
    }

    /**
     * Calcula uso total do dia.
     */
    private function getTodayUsage(): int
    {
        $total = 0;
        $today = now()->format('Y-m-d');
        
        for ($hour = 0; $hour < 24; $hour++) {
            $key = "traffic_api_usage:{$today}-{$hour}";
            $total += cache()->get($key, 0);
        }
        
        return $total;
    }

    /**
     * {@inheritdoc}
     */
    public function healthCheck(): bool
    {
        $nominatimHealth = $this->nominatimAdapter->healthCheck();
        $trafficHealth = $this->trafficAdapter->healthCheck();
        
        // Híbrido é saudável se pelo menos Nominatim funciona
        return $nominatimHealth;
    }

    /**
     * Obtém estatísticas detalhadas do adapter híbrido.
     */
    public function getStats(): array
    {
        return [
            'traffic_api_usage' => $this->getTrafficAPIUsage(),
            'cache_stats' => $this->cacheManager->getCacheStats(),
            'nominatim_health' => $this->nominatimAdapter->healthCheck(),
            'traffic_adapter_health' => $this->trafficAdapter->healthCheck(),
            'config' => $this->config
        ];
    }
}