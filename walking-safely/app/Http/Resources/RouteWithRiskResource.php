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
}
