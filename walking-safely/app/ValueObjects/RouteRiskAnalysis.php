<?php

namespace App\ValueObjects;

use JsonSerializable;

/**
 * Detailed risk analysis for a route.
 *
 * @see Requirement 2.4 - Analyze risk index of all regions in route
 */
class RouteRiskAnalysis implements JsonSerializable
{
    public function __construct(
        public readonly float $maxRiskIndex,
        public readonly float $averageRiskIndex,
        public readonly array $riskRegions,
        public readonly bool $requiresWarning,
        public readonly ?string $warningMessage = null,
        public readonly ?string $dominantCrimeType = null,
        public readonly int $highRiskRegionCount = 0,
    ) {}

    /**
     * Create from array data.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            maxRiskIndex: (float) ($data['max_risk_index'] ?? $data['maxRiskIndex'] ?? 0),
            averageRiskIndex: (float) ($data['average_risk_index'] ?? $data['averageRiskIndex'] ?? 0),
            riskRegions: $data['risk_regions'] ?? $data['riskRegions'] ?? [],
            requiresWarning: (bool) ($data['requires_warning'] ?? $data['requiresWarning'] ?? false),
            warningMessage: $data['warning_message'] ?? $data['warningMessage'] ?? null,
            dominantCrimeType: $data['dominant_crime_type'] ?? $data['dominantCrimeType'] ?? null,
            highRiskRegionCount: (int) ($data['high_risk_region_count'] ?? $data['highRiskRegionCount'] ?? 0),
        );
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'max_risk_index' => $this->maxRiskIndex,
            'average_risk_index' => $this->averageRiskIndex,
            'risk_regions' => $this->riskRegions,
            'requires_warning' => $this->requiresWarning,
            'warning_message' => $this->warningMessage,
            'dominant_crime_type' => $this->dominantCrimeType,
            'high_risk_region_count' => $this->highRiskRegionCount,
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
     * Check if this route has high risk regions.
     */
    public function hasHighRiskRegions(): bool
    {
        return $this->maxRiskIndex >= 70;
    }

    /**
     * Check if this route is safe (no warnings required).
     */
    public function isSafe(): bool
    {
        return !$this->requiresWarning;
    }
}
