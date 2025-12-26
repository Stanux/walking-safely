<?php

namespace App\ValueObjects;

use JsonSerializable;

/**
 * Route with risk analysis information.
 *
 * @see Requirement 2.4 - Analyze risk index of all regions in route
 * @see Requirement 2.5 - Inform user of maximum risk index
 */
class RouteWithRisk implements JsonSerializable
{
    public function __construct(
        public readonly Route $route,
        public readonly float $maxRiskIndex,
        public readonly float $averageRiskIndex,
        public readonly array $riskRegions,
        public readonly bool $requiresWarning,
        public readonly ?string $warningMessage = null,
    ) {}

    /**
     * Create from array data.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            route: $data['route'] instanceof Route
                ? $data['route']
                : Route::fromArray($data['route']),
            maxRiskIndex: (float) ($data['max_risk_index'] ?? $data['maxRiskIndex'] ?? 0),
            averageRiskIndex: (float) ($data['average_risk_index'] ?? $data['averageRiskIndex'] ?? 0),
            riskRegions: $data['risk_regions'] ?? $data['riskRegions'] ?? [],
            requiresWarning: (bool) ($data['requires_warning'] ?? $data['requiresWarning'] ?? false),
            warningMessage: $data['warning_message'] ?? $data['warningMessage'] ?? null,
        );
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'route' => $this->route->toArray(),
            'max_risk_index' => $this->maxRiskIndex,
            'average_risk_index' => $this->averageRiskIndex,
            'risk_regions' => $this->riskRegions,
            'requires_warning' => $this->requiresWarning,
            'warning_message' => $this->warningMessage,
        ];
    }

    /**
     * JSON serialization.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Get the route ID.
     */
    public function getId(): string
    {
        return $this->route->id;
    }

    /**
     * Get the route distance in meters.
     */
    public function getDistance(): float
    {
        return $this->route->distance;
    }

    /**
     * Get the route duration in seconds.
     */
    public function getDuration(): int
    {
        return $this->route->duration;
    }

    /**
     * Check if this route has high risk regions.
     */
    public function hasHighRiskRegions(): bool
    {
        return $this->maxRiskIndex >= 70;
    }
}
