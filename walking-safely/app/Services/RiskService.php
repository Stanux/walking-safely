<?php

namespace App\Services;

use App\Enums\OccurrenceSource;
use App\Models\CrimeType;
use App\Models\Occurrence;
use App\Models\Region;
use App\Models\RiskIndex;
use App\ValueObjects\Coordinates;
use App\ValueObjects\RiskFactor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RiskService
{
    /**
     * Number of days to consider for risk calculation.
     */
    public const CALCULATION_DAYS = 30;

    /**
     * Cache TTL for risk index in seconds (5 minutes).
     */
    public const CACHE_TTL = 300;

    /**
     * Weight factors for risk calculation.
     */
    public const WEIGHT_FREQUENCY = 0.30;
    public const WEIGHT_RECENCY = 0.25;
    public const WEIGHT_SEVERITY = 0.25;
    public const WEIGHT_CONFIDENCE = 0.20;

    /**
     * Severity multipliers.
     */
    public const SEVERITY_MULTIPLIERS = [
        'low' => 0.25,
        'medium' => 0.50,
        'high' => 0.75,
        'critical' => 1.00,
    ];

    /**
     * Calculate the risk index for a region.
     * Requirement 5.2: Consider weight, frequency, recency, and confidence.
     *
     * @param int $regionId
     * @return float Risk index value between 0 and 100
     */
    public function calculateRiskIndex(int $regionId): float
    {
        $occurrences = $this->getRecentOccurrences($regionId);

        if ($occurrences->isEmpty()) {
            return 0.0;
        }

        // Calculate each factor
        $frequencyContribution = $this->calculateFrequencyContribution($occurrences);
        $recencyContribution = $this->calculateRecencyContribution($occurrences);
        $severityContribution = $this->calculateSeverityContribution($occurrences);
        $confidenceContribution = $this->calculateConfidenceContribution($occurrences);

        // Calculate weighted sum
        $riskIndex = (
            (self::WEIGHT_FREQUENCY * $frequencyContribution) +
            (self::WEIGHT_RECENCY * $recencyContribution) +
            (self::WEIGHT_SEVERITY * $severityContribution) +
            (self::WEIGHT_CONFIDENCE * $confidenceContribution)
        );

        // Ensure value is within bounds
        return max(0, min(100, $riskIndex));
    }

    /**
     * Get recent occurrences for a region within the calculation period.
     */
    private function getRecentOccurrences(int $regionId): Collection
    {
        return Occurrence::query()
            ->inRegion($regionId)
            ->active()
            ->withinDays(self::CALCULATION_DAYS)
            ->with('crimeType.category')
            ->get();
    }

    /**
     * Calculate frequency contribution (0-100).
     * Based on number of occurrences relative to expected baseline.
     */
    private function calculateFrequencyContribution(Collection $occurrences): float
    {
        $count = $occurrences->count();

        // Apply logarithmic scaling to prevent extreme values
        // Baseline: 10 occurrences/month = 50 contribution
        $baseline = 10;
        $contribution = ($count / $baseline) * 50;

        return min(100, $contribution);
    }

    /**
     * Calculate recency contribution (0-100).
     * More recent occurrences contribute more.
     */
    private function calculateRecencyContribution(Collection $occurrences): float
    {
        if ($occurrences->isEmpty()) {
            return 0;
        }

        $now = now();
        $totalWeight = 0;
        $weightedSum = 0;

        foreach ($occurrences as $occurrence) {
            $daysAgo = $occurrence->timestamp->diffInDays($now);
            // Exponential decay: recent events have more weight
            $weight = exp(-$daysAgo / 7); // Half-life of ~7 days
            $totalWeight += $weight;
            $weightedSum += $weight * 100;
        }

        if ($totalWeight === 0) {
            return 0;
        }

        return $weightedSum / $totalWeight;
    }

    /**
     * Calculate severity contribution (0-100).
     * Based on weighted average of occurrence severities and crime type weights.
     */
    private function calculateSeverityContribution(Collection $occurrences): float
    {
        if ($occurrences->isEmpty()) {
            return 0;
        }

        $totalWeight = 0;
        $weightedSum = 0;

        foreach ($occurrences as $occurrence) {
            $severityMultiplier = self::SEVERITY_MULTIPLIERS[$occurrence->severity->value] ?? 0.5;
            $crimeTypeWeight = $occurrence->crimeType?->getWeight() ?? 1.0;

            $weight = $severityMultiplier * $crimeTypeWeight;
            $totalWeight += 1;
            $weightedSum += $weight * 100;
        }

        if ($totalWeight === 0) {
            return 0;
        }

        return $weightedSum / $totalWeight;
    }

    /**
     * Calculate confidence contribution (0-100).
     * Higher confidence scores contribute more to the risk.
     */
    private function calculateConfidenceContribution(Collection $occurrences): float
    {
        if ($occurrences->isEmpty()) {
            return 0;
        }

        $totalConfidence = $occurrences->sum('confidence_score');
        $maxPossibleConfidence = $occurrences->count() * 5; // Max confidence is 5

        if ($maxPossibleConfidence === 0) {
            return 0;
        }

        return ($totalConfidence / $maxPossibleConfidence) * 100;
    }

    /**
     * Recalculate and update the risk index for a region.
     * Requirement 5.3: Recalculate within 5 minutes of new occurrence.
     */
    public function recalculateRegionRisk(int $regionId): RiskIndex
    {
        $riskValue = $this->calculateRiskIndex($regionId);
        $occurrences = $this->getRecentOccurrences($regionId);

        // Build risk factors
        $factors = $this->buildRiskFactors($occurrences);

        // Find dominant crime type
        $dominantCrimeTypeId = $this->findDominantCrimeType($occurrences);

        // Update or create risk index
        $riskIndex = RiskIndex::updateOrCreate(
            ['region_id' => $regionId],
            [
                'value' => $riskValue,
                'calculated_at' => now(),
                'factors' => array_map(fn($f) => $f->toArray(), $factors),
                'occurrence_count' => $occurrences->count(),
                'dominant_crime_type_id' => $dominantCrimeTypeId,
            ]
        );

        // Clear cache
        $this->clearRiskCache($regionId);

        return $riskIndex;
    }

    /**
     * Build risk factors array for storage.
     */
    private function buildRiskFactors(Collection $occurrences): array
    {
        return [
            new RiskFactor(
                RiskFactor::TYPE_FREQUENCY,
                self::WEIGHT_FREQUENCY,
                $this->calculateFrequencyContribution($occurrences)
            ),
            new RiskFactor(
                RiskFactor::TYPE_RECENCY,
                self::WEIGHT_RECENCY,
                $this->calculateRecencyContribution($occurrences)
            ),
            new RiskFactor(
                RiskFactor::TYPE_SEVERITY,
                self::WEIGHT_SEVERITY,
                $this->calculateSeverityContribution($occurrences)
            ),
            new RiskFactor(
                RiskFactor::TYPE_CONFIDENCE,
                self::WEIGHT_CONFIDENCE,
                $this->calculateConfidenceContribution($occurrences)
            ),
        ];
    }

    /**
     * Find the most common crime type in the occurrences.
     */
    private function findDominantCrimeType(Collection $occurrences): ?int
    {
        if ($occurrences->isEmpty()) {
            return null;
        }

        $crimeTypeCounts = $occurrences
            ->groupBy('crime_type_id')
            ->map(fn($group) => $group->count());

        if ($crimeTypeCounts->isEmpty()) {
            return null;
        }

        return $crimeTypeCounts->sortDesc()->keys()->first();
    }

    /**
     * Get the risk index for a region.
     */
    public function getRiskForRegion(int $regionId): ?RiskIndex
    {
        $cacheKey = "risk_index:{$regionId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($regionId) {
            return RiskIndex::where('region_id', $regionId)->first();
        });
    }

    /**
     * Get the risk index for coordinates.
     * Finds the region containing the coordinates and returns its risk.
     */
    public function getRiskForCoordinates(Coordinates $coordinates): ?RiskIndex
    {
        $point = $coordinates->toPoint();

        $region = Region::query()
            ->whereContains('boundary', $point)
            ->orderBy('type', 'desc') // Prefer more specific regions
            ->first();

        if (!$region) {
            return null;
        }

        return $this->getRiskForRegion($region->id);
    }

    /**
     * Get risk indexes along a route (array of coordinates).
     *
     * @param Coordinates[] $waypoints
     * @return RiskIndex[]
     */
    public function getRiskAlongRoute(array $waypoints): array
    {
        $riskIndexes = [];
        $processedRegions = [];

        foreach ($waypoints as $waypoint) {
            $point = $waypoint->toPoint();

            // Find regions containing this point
            $regions = Region::query()
                ->whereContains('boundary', $point)
                ->get();

            foreach ($regions as $region) {
                // Skip already processed regions
                if (in_array($region->id, $processedRegions)) {
                    continue;
                }

                $processedRegions[] = $region->id;
                $riskIndex = $this->getRiskForRegion($region->id);

                if ($riskIndex) {
                    $riskIndexes[] = $riskIndex;
                }
            }
        }

        return $riskIndexes;
    }

    /**
     * Get the maximum risk index along a route.
     *
     * @param Coordinates[] $waypoints
     * @return float
     */
    public function getMaxRiskAlongRoute(array $waypoints): float
    {
        $riskIndexes = $this->getRiskAlongRoute($waypoints);

        if (empty($riskIndexes)) {
            return 0.0;
        }

        return max(array_map(fn($ri) => $ri->value, $riskIndexes));
    }

    /**
     * Get the average risk index along a route.
     *
     * @param Coordinates[] $waypoints
     * @return float
     */
    public function getAverageRiskAlongRoute(array $waypoints): float
    {
        $riskIndexes = $this->getRiskAlongRoute($waypoints);

        if (empty($riskIndexes)) {
            return 0.0;
        }

        $sum = array_sum(array_map(fn($ri) => $ri->value, $riskIndexes));
        return $sum / count($riskIndexes);
    }

    /**
     * Get high risk regions along a route.
     *
     * @param Coordinates[] $waypoints
     * @return RiskIndex[]
     */
    public function getHighRiskRegionsAlongRoute(array $waypoints): array
    {
        $riskIndexes = $this->getRiskAlongRoute($waypoints);

        return array_filter(
            $riskIndexes,
            fn($ri) => $ri->isHighRisk()
        );
    }

    /**
     * Check if a route requires a warning (has regions with risk >= 50).
     *
     * @param Coordinates[] $waypoints
     * @return bool
     */
    public function routeRequiresWarning(array $waypoints): bool
    {
        $riskIndexes = $this->getRiskAlongRoute($waypoints);

        foreach ($riskIndexes as $riskIndex) {
            if ($riskIndex->requiresWarning()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Clear the risk cache for a region.
     */
    private function clearRiskCache(int $regionId): void
    {
        Cache::forget("risk_index:{$regionId}");
    }

    /**
     * Dispatch job to recalculate all risk indexes.
     */
    public function dispatchRecalculateAllRisks(): void
    {
        \App\Jobs\RecalculateRiskIndex::dispatch();
    }

    /**
     * Recalculate risk for all regions (batch operation).
     */
    public function recalculateAllRegions(): int
    {
        $regions = Region::all();
        $count = 0;

        foreach ($regions as $region) {
            $this->recalculateRegionRisk($region->id);
            $count++;
        }

        return $count;
    }

    /**
     * Get initial confidence score based on source.
     * Requirement 5.4: Official = 5, Collaborative = 2.
     */
    public function getInitialConfidenceScore(OccurrenceSource $source): int
    {
        return $source->getInitialConfidenceScore();
    }
}
