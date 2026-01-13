<?php

namespace App\Services\MapAdapters;

use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * HERE Maps API adapter otimizado para dados de trânsito.
 * 
 * Vantagens para MVP:
 * - 250k chamadas gratuitas/mês
 * - $1/1k após limite
 * - Dados de trânsito inclusos
 * - Cobertura excelente no Brasil
 */
class HereMapsTrafficAdapter extends AbstractMapAdapter
{
    private const PROVIDER_NAME = 'here';
    
    // HERE API v8 endpoints
    private const GEOCODING_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';
    private const REVERSE_GEOCODING_API_URL = 'https://revgeocode.search.hereapi.com/v1/revgeocode';
    private const ROUTING_API_URL = 'https://router.hereapi.com/v8/routes';
    private const TRAFFIC_API_URL = 'https://data.traffic.hereapi.com/v7/flow';
    
    private string $apiKey;

    public function __construct(QuotaManager $quotaManager)
    {
        parent::__construct($quotaManager);
        $this->apiKey = config('services.here_maps.api_key');
        
        if (empty($this->apiKey)) {
            throw new \InvalidArgumentException('HERE Maps API key não configurada');
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getProviderName(): string
    {
        return self::PROVIDER_NAME;
    }

    /**
     * {@inheritdoc}
     */
    protected function doGeocode(string $address): array
    {
        $params = [
            'q' => $address,
            'apikey' => $this->apiKey,
            'limit' => 5,
            'lang' => 'pt-BR'
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);
        
        if (!isset($response['items']) || empty($response['items'])) {
            return [];
        }

        return array_map(function ($item) {
            return [
                'lat' => $item['position']['lat'],
                'lng' => $item['position']['lng'],
                'formatted_address' => $item['title'] ?? '',
                'confidence' => $this->calculateConfidence($item),
                'components' => $this->parseAddressComponents($item)
            ];
        }, $response['items']);
    }

    /**
     * {@inheritdoc}
     */
    protected function doReverseGeocode(Coordinates $coordinates): Address
    {
        $lat = $coordinates->latitude;
        $lng = $coordinates->longitude;
        
        $params = [
            'at' => "{$lat},{$lng}",
            'apikey' => $this->apiKey,
            'lang' => 'pt-BR'
        ];

        $response = $this->httpGet(self::REVERSE_GEOCODING_API_URL, $params);
        
        if (!isset($response['items'][0])) {
            return new Address(
                formattedAddress: '',
                coordinates: $coordinates
            );
        }

        $item = $response['items'][0];
        
        return new Address(
            formattedAddress: $item['title'] ?? '',
            coordinates: $coordinates,
            street: $item['address']['street'] ?? null,
            number: $item['address']['houseNumber'] ?? null,
            neighborhood: $item['address']['district'] ?? null,
            city: $item['address']['city'] ?? null,
            state: $item['address']['state'] ?? null,
            country: $item['address']['countryName'] ?? null,
            postalCode: $item['address']['postalCode'] ?? null
        );
    }

    /**
     * {@inheritdoc}
     */
    protected function doCalculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options = null
    ): Route {
        $params = [
            'transportMode' => $options?->mode ?? 'pedestrian',
            'origin' => "{$origin->latitude},{$origin->longitude}",
            'destination' => "{$destination->latitude},{$destination->longitude}",
            'return' => 'polyline,summary,instructions,travelSummary',
            'apikey' => $this->apiKey,
            'lang' => 'pt-BR'
        ];

        // Inclui dados de trânsito se disponível
        if (($options?->mode ?? 'pedestrian') === 'car') {
            $params['departureTime'] = 'now';
            $params['traffic'] = 'enabled';
        }

        $response = $this->httpGet(self::ROUTING_API_URL, $params);
        
        if (!isset($response['routes'][0])) {
            throw new \Exception('Nenhuma rota encontrada');
        }

        $route = $response['routes'][0];
        $section = $route['sections'][0];
        
        return Route::fromArray([
            'origin' => $origin,
            'destination' => $destination,
            'distance' => $section['travelSummary']['length'], // metros
            'duration' => $section['travelSummary']['duration'], // segundos
            'polyline' => $section['polyline'] ?? '',
            'provider' => self::PROVIDER_NAME
        ]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doCalculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count = 3
    ): array {
        $params = [
            'transportMode' => 'pedestrian',
            'origin' => "{$origin->latitude},{$origin->longitude}",
            'destination' => "{$destination->latitude},{$destination->longitude}",
            'return' => 'polyline,summary,instructions,travelSummary',
            'alternatives' => $count,
            'apikey' => $this->apiKey,
            'lang' => 'pt-BR'
        ];

        $response = $this->httpGet(self::ROUTING_API_URL, $params);
        
        if (!isset($response['routes']) || empty($response['routes'])) {
            return [];
        }

        return array_map(function ($route) use ($origin, $destination) {
            $section = $route['sections'][0];
            return Route::fromArray([
                'origin' => $origin,
                'destination' => $destination,
                'distance' => $section['travelSummary']['length'],
                'duration' => $section['travelSummary']['duration'],
                'polyline' => $section['polyline'] ?? '',
                'provider' => self::PROVIDER_NAME
            ]);
        }, $response['routes']);
    }

    /**
     * {@inheritdoc}
     */
    protected function doGetTrafficData(Route $route): TrafficData
    {
        // HERE inclui dados de trânsito no roteamento
        // Usa os waypoints da rota para consultar trânsito
        $waypoints = $route->waypoints;
        
        if (empty($waypoints)) {
            // Se não há waypoints, usa origin e destination
            $waypoints = [
                ['lat' => $route->origin->latitude, 'lng' => $route->origin->longitude],
                ['lat' => $route->destination->latitude, 'lng' => $route->destination->longitude]
            ];
        }

        // Pega alguns pontos da rota para consultar trânsito
        $samplePoints = $this->sampleRoutePoints(
            array_map(fn($wp) => ['lat' => $wp->latitude ?? $wp['lat'], 'lng' => $wp->longitude ?? $wp['lng']], $waypoints),
            5
        );
        $trafficData = [];
        
        foreach ($samplePoints as $point) {
            $params = [
                'at' => "{$point['lat']},{$point['lng']}",
                'apikey' => $this->apiKey
            ];

            try {
                $response = $this->httpGet(self::TRAFFIC_API_URL, $params);
                if (isset($response['results'][0])) {
                    $trafficData[] = $response['results'][0];
                }
            } catch (\Exception $e) {
                Log::warning('Erro ao buscar dados de trânsito HERE', [
                    'point' => $point,
                    'error' => $e->getMessage()
                ]);
            }
        }

        if (empty($trafficData)) {
            return $this->getEstimatedTrafficData($route);
        }

        return $this->aggregateTrafficData($trafficData, $route);
    }

    /**
     * Agrega dados de trânsito de múltiplos pontos.
     */
    private function aggregateTrafficData(array $trafficData, Route $route): TrafficData
    {
        if (empty($trafficData)) {
            return $this->getEstimatedTrafficData($route);
        }

        $totalDelay = 0;
        $incidents = [];
        $avgSpeed = 0;
        $speedCount = 0;

        foreach ($trafficData as $data) {
            if (isset($data['currentFlow'])) {
                $flow = $data['currentFlow'];
                
                // Calcula delay baseado na velocidade
                $freeFlowSpeed = $flow['freeFlowSpeed'] ?? 50;
                $currentSpeed = $flow['speed'] ?? $freeFlowSpeed;
                
                if ($freeFlowSpeed > 0) {
                    $speedRatio = $currentSpeed / $freeFlowSpeed;
                    $segmentDelay = ($route->duration / count($trafficData)) * (1 - $speedRatio);
                    $totalDelay += max(0, $segmentDelay);
                }

                $avgSpeed += $currentSpeed;
                $speedCount++;
            }

            // Coleta incidentes se disponíveis
            if (isset($data['incidents'])) {
                $incidents = array_merge($incidents, $data['incidents']);
            }
        }

        $avgSpeed = $speedCount > 0 ? $avgSpeed / $speedCount : 0;
        $currentDuration = $route->duration + $totalDelay;

        return TrafficData::fromArray([
            'current_duration' => $currentDuration,
            'typical_duration' => $route->duration,
            'delay' => $totalDelay,
            'average_speed' => $avgSpeed,
            'incidents' => $this->parseIncidents($incidents),
            'confidence' => $this->calculateTrafficConfidence($trafficData)
        ]);
    }

    /**
     * Gera dados estimados quando não há dados de trânsito.
     */
    private function getEstimatedTrafficData(Route $route): TrafficData
    {
        $hour = now()->hour;
        $isWeekend = now()->isWeekend();
        
        // Fatores de trânsito baseados em padrões
        $trafficFactor = 1.0;
        
        if (!$isWeekend) {
            if ($hour >= 7 && $hour <= 9) {
                $trafficFactor = 1.3; // Pico manhã
            } elseif ($hour >= 17 && $hour <= 19) {
                $trafficFactor = 1.4; // Pico tarde
            } elseif ($hour >= 12 && $hour <= 14) {
                $trafficFactor = 1.1; // Almoço
            }
        }

        $estimatedDuration = $route->duration * $trafficFactor;
        $delay = $estimatedDuration - $route->duration;

        return TrafficData::fromArray([
            'current_duration' => $estimatedDuration,
            'typical_duration' => $route->duration,
            'delay' => $delay,
            'incidents' => [],
            'estimated' => true,
            'confidence' => 0.7
        ]);
    }

    /**
     * Amostra pontos da rota para consulta de trânsito.
     */
    private function sampleRoutePoints(array $coordinates, int $maxPoints): array
    {
        $total = count($coordinates);
        if ($total <= $maxPoints) {
            return $coordinates;
        }

        $step = intval($total / $maxPoints);
        $sampled = [];
        
        for ($i = 0; $i < $total; $i += $step) {
            $sampled[] = $coordinates[$i];
        }

        return $sampled;
    }

    /**
     * Calcula confiança dos dados de trânsito.
     */
    private function calculateTrafficConfidence(array $trafficData): float
    {
        if (empty($trafficData)) {
            return 0.5;
        }

        $confidence = 0.8; // Base para HERE
        
        // Reduz confiança se poucos pontos de dados
        if (count($trafficData) < 3) {
            $confidence -= 0.2;
        }

        return max(0.3, min(1.0, $confidence));
    }

    /**
     * Parse incidentes de trânsito.
     */
    private function parseIncidents(array $incidents): array
    {
        return array_map(function ($incident) {
            return [
                'type' => $incident['type'] ?? 'unknown',
                'description' => $incident['description'] ?? '',
                'severity' => $incident['criticality'] ?? 'minor',
                'location' => $incident['location'] ?? null
            ];
        }, $incidents);
    }

    /**
     * {@inheritdoc}
     */
    protected function doHealthCheck(): bool
    {
        try {
            $params = [
                'q' => 'São Paulo, Brazil',
                'apikey' => $this->apiKey,
                'limit' => 1
            ];

            $response = $this->httpGet(self::GEOCODING_API_URL, $params);
            return isset($response['items']) && !empty($response['items']);
            
        } catch (\Exception $e) {
            Log::error('HERE Maps health check failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Calcula confiança do resultado de geocodificação.
     */
    private function calculateConfidence(array $item): float
    {
        $confidence = 0.5;
        
        // Aumenta confiança baseado na qualidade do match
        if (isset($item['scoring']['queryScore'])) {
            $confidence = $item['scoring']['queryScore'];
        }
        
        // Ajusta baseado no tipo de resultado
        $resultType = $item['resultType'] ?? '';
        switch ($resultType) {
            case 'houseNumber':
                $confidence += 0.2;
                break;
            case 'street':
                $confidence += 0.1;
                break;
            case 'locality':
                $confidence -= 0.1;
                break;
        }

        return max(0.1, min(1.0, $confidence));
    }

    /**
     * Parse componentes do endereço.
     */
    private function parseAddressComponents(array $item): array
    {
        $address = $item['address'] ?? [];
        
        return [
            'street_number' => $address['houseNumber'] ?? '',
            'street_name' => $address['street'] ?? '',
            'neighborhood' => $address['district'] ?? '',
            'city' => $address['city'] ?? '',
            'state' => $address['state'] ?? '',
            'postal_code' => $address['postalCode'] ?? '',
            'country' => $address['countryName'] ?? ''
        ];
    }

    /**
     * Decodifica polyline do HERE (formato flexível).
     */
    private function decodePolyline(string $polyline): array
    {
        // HERE usa formato próprio, implementação simplificada
        // Em produção, usar biblioteca específica do HERE
        return [];
    }

    /**
     * Parse instruções de navegação.
     */
    private function parseInstructions(array $actions): array
    {
        return array_map(function ($action) {
            return [
                'instruction' => $action['instruction'] ?? '',
                'distance' => $action['length'] ?? 0,
                'duration' => $action['duration'] ?? 0
            ];
        }, $actions);
    }
}