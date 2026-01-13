<?php

namespace App\Http\Resources;

use App\ValueObjects\RouteWithRisk;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for RouteWithRisk.
 *
 * @see Requirement 2.4 - Return route with risk analysis
 * @see Requirement 2.5 - Inform user of maximum risk index
 * @see Requirement 2.6 - Display warning for high-risk routes
 */
class RouteWithRiskResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var RouteWithRisk
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'route' => [
                'id' => $this->resource->route->id,
                'origin' => $this->resource->route->origin->toArray(),
                'destination' => $this->resource->route->destination->toArray(),
                'waypoints' => array_map(
                    fn($wp) => $wp->toArray(),
                    $this->resource->route->waypoints
                ),
                'distance' => $this->resource->route->distance,
                'distance_formatted' => $this->formatDistance($this->resource->route->distance),
                'duration' => $this->resource->route->duration,
                'duration_formatted' => $this->formatDuration($this->resource->route->duration),
                'polyline' => $this->resource->route->polyline,
                'provider' => $this->resource->route->provider,
                'instructions' => $this->generateInstructions($this->resource->route),
            ],
            'risk_analysis' => [
                'max_risk_index' => round($this->resource->maxRiskIndex, 1),
                'average_risk_index' => round($this->resource->averageRiskIndex, 1),
                'risk_level' => $this->getRiskLevel($this->resource->maxRiskIndex),
                'risk_regions' => $this->resource->riskRegions,
                'has_high_risk_regions' => $this->resource->hasHighRiskRegions(),
            ],
            'warning' => [
                'requires_warning' => $this->resource->requiresWarning,
                'message' => $this->resource->warningMessage,
            ],
        ];
    }

    /**
     * Format distance in human-readable format.
     */
    private function formatDistance(float $meters): string
    {
        if ($meters >= 1000) {
            return round($meters / 1000, 1) . ' km';
        }

        return round($meters) . ' m';
    }

    /**
     * Format duration in human-readable format.
     */
    private function formatDuration(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return sprintf('%dh %dmin', $hours, $minutes);
        }

        return sprintf('%d min', $minutes);
    }

    /**
     * Get risk level label based on index.
     */
    private function getRiskLevel(float $riskIndex): string
    {
        return match (true) {
            $riskIndex >= 70 => 'high',
            $riskIndex >= 50 => 'moderate',
            $riskIndex >= 30 => 'low',
            default => 'minimal',
        };
    }

    /**
     * Generate navigation instructions from route waypoints.
     */
    private function generateInstructions($route): array
    {
        $waypoints = $route->waypoints;
        $instructions = [];

        if (empty($waypoints)) {
            return [
                [
                    'maneuver' => 'depart',
                    'text' => 'Inicie o percurso',
                    'distance' => 0,
                    'coordinates' => $route->origin->toArray(),
                ],
                [
                    'maneuver' => 'arrive',
                    'text' => 'Você chegou ao destino',
                    'distance' => (int) $route->distance,
                    'coordinates' => $route->destination->toArray(),
                ]
            ];
        }

        // Instrução inicial
        $instructions[] = [
            'maneuver' => 'depart',
            'text' => 'Inicie o percurso',
            'distance' => 0,
            'coordinates' => $route->origin->toArray(),
        ];

        // Analisar todos os waypoints para detectar mudanças de direção significativas
        $lastBearing = null;
        $lastInstructionIndex = 0;
        $accumulatedDistance = 0;
        
        // Adicionar origem como primeiro ponto
        $allPoints = array_merge([$route->origin], $waypoints, [$route->destination]);
        
        for ($i = 1; $i < count($allPoints) - 1; $i++) {
            $currentPoint = $allPoints[$i];
            $prevPoint = $allPoints[$i - 1];
            $nextPoint = $allPoints[$i + 1];
            
            // Calcular bearing atual e próximo
            $currentBearing = $this->calculateBearing($prevPoint, $currentPoint);
            $nextBearing = $this->calculateBearing($currentPoint, $nextPoint);
            
            // Calcular diferença angular
            $bearingDiff = $this->calculateBearingDifference($currentBearing, $nextBearing);
            
            // Acumular distância
            $segmentDistance = $this->calculateDistance($prevPoint, $currentPoint);
            $accumulatedDistance += $segmentDistance;
            
            // Detectar mudança significativa de direção (mais de 15 graus) ou distância mínima
            $isSignificantTurn = abs($bearingDiff) > 15;
            $isMinimumDistance = $accumulatedDistance > 100; // Mínimo 100 metros
            $isLongSegment = $accumulatedDistance > 2000; // Quebrar segmentos muito longos (2km)
            
            if (($isSignificantTurn && $isMinimumDistance) || $isLongSegment || $i == count($allPoints) - 2) {
                
                $maneuver = $this->getManeuverFromBearingDifference($bearingDiff);
                
                // Para a primeira instrução após o início, sempre usar a direção atual
                if (count($instructions) == 1) {
                    $maneuver = $this->getManeuverFromBearing($currentBearing);
                }
                
                // Se é um segmento longo sem curva, manter como straight
                if ($isLongSegment && !$isSignificantTurn) {
                    $maneuver = 'straight';
                }
                
                $instructions[] = [
                    'maneuver' => $maneuver,
                    'text' => $this->getInstructionText($maneuver, $accumulatedDistance),
                    'distance' => (int) $accumulatedDistance,
                    'coordinates' => $currentPoint->toArray(),
                ];
                
                $lastInstructionIndex = $i;
                $accumulatedDistance = 0;
            }
        }
        
        // Se sobrou distância acumulada, adicionar instrução final antes do destino
        if ($accumulatedDistance > 50) {
            $instructions[] = [
                'maneuver' => 'straight',
                'text' => $this->getInstructionText('straight', $accumulatedDistance),
                'distance' => (int) $accumulatedDistance,
                'coordinates' => $allPoints[count($allPoints) - 2]->toArray(),
            ];
        }

        // Instrução final
        $instructions[] = [
            'maneuver' => 'arrive',
            'text' => 'Você chegou ao destino',
            'distance' => 0,
            'coordinates' => $route->destination->toArray(),
        ];

        return $instructions;
    }

    /**
     * Calculate bearing between two points.
     */
    private function calculateBearing($point1, $point2): float
    {
        $lat1 = deg2rad($point1->latitude);
        $lat2 = deg2rad($point2->latitude);
        $deltaLng = deg2rad($point2->longitude - $point1->longitude);

        $y = sin($deltaLng) * cos($lat2);
        $x = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($deltaLng);

        $bearing = atan2($y, $x);
        return fmod(rad2deg($bearing) + 360, 360);
    }

    /**
     * Calculate the difference between two bearings.
     */
    private function calculateBearingDifference($bearing1, $bearing2): float
    {
        $diff = $bearing2 - $bearing1;
        
        // Normalizar para -180 a 180
        while ($diff > 180) $diff -= 360;
        while ($diff < -180) $diff += 360;
        
        return $diff;
    }

    /**
     * Get maneuver type from bearing difference.
     */
    private function getManeuverFromBearingDifference(float $bearingDiff): string
    {
        $absDiff = abs($bearingDiff);
        
        if ($absDiff < 30) return 'straight';
        if ($absDiff > 150) return 'uturn';
        
        if ($bearingDiff > 0) {
            // Virar à direita
            if ($absDiff < 60) return 'turn-slight-right';
            if ($absDiff < 120) return 'turn-right';
            return 'turn-sharp-right';
        } else {
            // Virar à esquerda
            if ($absDiff < 60) return 'turn-slight-left';
            if ($absDiff < 120) return 'turn-left';
            return 'turn-sharp-left';
        }
    }

    /**
     * Get maneuver type from bearing.
     */
    private function getManeuverFromBearing(float $bearing): string
    {
        if ($bearing >= 315 || $bearing < 45) return 'straight';
        if ($bearing >= 45 && $bearing < 135) return 'turn-right';
        if ($bearing >= 135 && $bearing < 225) return 'uturn';
        if ($bearing >= 225 && $bearing < 315) return 'turn-left';
        return 'straight';
    }

    /**
     * Calculate distance between two points in meters.
     */
    private function calculateDistance($point1, $point2): float
    {
        $earthRadius = 6371000; // metros

        $lat1 = deg2rad($point1->latitude);
        $lat2 = deg2rad($point2->latitude);
        $deltaLat = deg2rad($point2->latitude - $point1->latitude);
        $deltaLng = deg2rad($point2->longitude - $point1->longitude);

        $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
             cos($lat1) * cos($lat2) *
             sin($deltaLng / 2) * sin($deltaLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Get instruction text for maneuver.
     */
    private function getInstructionText(string $maneuver, float $distance): string
    {
        $distanceText = $distance >= 1000 
            ? number_format($distance / 1000, 1) . ' km'
            : number_format($distance) . ' m';

        return match ($maneuver) {
            'turn-left' => "Vire à esquerda e continue por {$distanceText}",
            'turn-right' => "Vire à direita e continue por {$distanceText}",
            'turn-slight-left' => "Vire levemente à esquerda e continue por {$distanceText}",
            'turn-slight-right' => "Vire levemente à direita e continue por {$distanceText}",
            'turn-sharp-left' => "Vire acentuadamente à esquerda e continue por {$distanceText}",
            'turn-sharp-right' => "Vire acentuadamente à direita e continue por {$distanceText}",
            'uturn' => "Faça o retorno e continue por {$distanceText}",
            'straight' => "Continue em frente por {$distanceText}",
            default => "Continue por {$distanceText}",
        };
    }
}
