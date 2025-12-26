<?php

namespace App\Services;

use App\Enums\OccurrenceStatus;
use App\Models\Occurrence;
use App\Models\Region;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use MatanYadaev\EloquentSpatial\Objects\Point;
use MatanYadaev\EloquentSpatial\Objects\Polygon;

/**
 * Service for generating heatmap data from occurrences.
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
class HeatmapService
{
    /**
     * Cache TTL for heatmap data in seconds (5 minutes).
     * Requirement 10.4: Update within 5 minutes of new occurrences.
     */
    public const CACHE_TTL = 300;

    /**
     * Default number of days to include in heatmap.
     */
    public const DEFAULT_DAYS = 30;

    /**
     * Minimum zoom level for aggregation.
     */
    public const MIN_ZOOM = 1;

    /**
     * Maximum zoom level for aggregation.
     */
    public const MAX_ZOOM = 18;

    /**
     * Get heatmap data for a given bounding box.
     * Requirement 10.1: Render heatmap layer showing occurrence concentration.
     *
     * @param array $bounds Bounding box [minLat, minLng, maxLat, maxLng]
     * @param array $filters Optional filters (crime_type_id, start_date, end_date, days)
     * @param int $zoom Current zoom level for granularity adjustment
     * @return array Heatmap data points with intensity
     */
    public function getHeatmapData(array $bounds, array $filters = [], int $zoom = 10): array
    {
        $cacheKey = $this->buildCacheKey($bounds, $filters, $zoom);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($bounds, $filters, $zoom) {
            return $this->generateHeatmapData($bounds, $filters, $zoom);
        });
    }

    /**
     * Generate heatmap data without caching.
     */
    protected function generateHeatmapData(array $bounds, array $filters, int $zoom): array
    {
        $query = $this->buildOccurrenceQuery($bounds, $filters);
        
        // Adjust granularity based on zoom level (Requirement 10.3)
        $gridSize = $this->calculateGridSize($zoom);
        
        // Aggregate occurrences by grid cells
        return $this->aggregateByGrid($query, $gridSize, $bounds);
    }

    /**
     * Build the base occurrence query with filters.
     * Requirement 10.2: Filter by crime type and time period.
     */
    protected function buildOccurrenceQuery(array $bounds, array $filters): \Illuminate\Database\Eloquent\Builder
    {
        $query = Occurrence::query()
            ->where('status', OccurrenceStatus::ACTIVE);

        // Apply bounding box filter
        if (count($bounds) === 4) {
            [$minLat, $minLng, $maxLat, $maxLng] = $bounds;
            $query->whereRaw(
                'ST_Within(location, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
                [$minLng, $minLat, $maxLng, $maxLat]
            );
        }

        // Filter by crime type (Requirement 10.2)
        if (isset($filters['crime_type_id'])) {
            $query->where('crime_type_id', $filters['crime_type_id']);
        }

        // Filter by crime category (includes all types in category)
        if (isset($filters['crime_category_id'])) {
            $query->whereHas('crimeType', function ($q) use ($filters) {
                $q->where('category_id', $filters['crime_category_id']);
            });
        }

        // Filter by time period (Requirement 10.2)
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('timestamp', [
                $filters['start_date'],
                $filters['end_date']
            ]);
        } elseif (isset($filters['days'])) {
            $query->where('timestamp', '>=', now()->subDays($filters['days']));
        } else {
            // Default to last 30 days
            $query->where('timestamp', '>=', now()->subDays(self::DEFAULT_DAYS));
        }

        return $query;
    }

    /**
     * Calculate grid cell size based on zoom level.
     * Requirement 10.3: Adjust granularity proportionally to zoom.
     *
     * @param int $zoom Zoom level (1-18)
     * @return float Grid size in degrees
     */
    public function calculateGridSize(int $zoom): float
    {
        // Clamp zoom to valid range
        $zoom = max(self::MIN_ZOOM, min(self::MAX_ZOOM, $zoom));

        // At zoom 1, grid is ~10 degrees; at zoom 18, grid is ~0.0001 degrees
        // Using exponential scaling for smooth transition
        return 10.0 / pow(2, $zoom - 1);
    }

    /**
     * Aggregate occurrences by grid cells.
     */
    protected function aggregateByGrid(
        \Illuminate\Database\Eloquent\Builder $query,
        float $gridSize,
        array $bounds
    ): array {
        // Use raw SQL for efficient grid aggregation
        $results = $query
            ->selectRaw(
                'FLOOR(ST_Y(location::geometry) / ?) * ? as lat_cell',
                [$gridSize, $gridSize]
            )
            ->selectRaw(
                'FLOOR(ST_X(location::geometry) / ?) * ? as lng_cell',
                [$gridSize, $gridSize]
            )
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('AVG(confidence_score) as avg_confidence')
            ->groupBy('lat_cell', 'lng_cell')
            ->get();

        // Transform to heatmap points
        $points = [];
        $maxCount = $results->max('count') ?: 1;

        foreach ($results as $result) {
            // Center of the grid cell
            $lat = $result->lat_cell + ($gridSize / 2);
            $lng = $result->lng_cell + ($gridSize / 2);

            // Calculate intensity (0-1) based on count
            $intensity = $result->count / $maxCount;

            $points[] = [
                'latitude' => round($lat, 6),
                'longitude' => round($lng, 6),
                'count' => (int) $result->count,
                'intensity' => round($intensity, 4),
                'avg_confidence' => round($result->avg_confidence, 2),
            ];
        }

        return [
            'points' => $points,
            'total_occurrences' => $results->sum('count'),
            'grid_size' => $gridSize,
            'bounds' => $bounds,
        ];
    }

    /**
     * Get heatmap data aggregated by region.
     * Requirement 10.1: Show concentration by region.
     */
    public function getHeatmapByRegion(array $filters = []): array
    {
        $cacheKey = 'heatmap:by_region:' . md5(json_encode($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            return $this->generateHeatmapByRegion($filters);
        });
    }

    /**
     * Generate heatmap data aggregated by region.
     */
    protected function generateHeatmapByRegion(array $filters): array
    {
        $query = Occurrence::query()
            ->where('status', OccurrenceStatus::ACTIVE)
            ->whereNotNull('region_id');

        // Apply time filters
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('timestamp', [
                $filters['start_date'],
                $filters['end_date']
            ]);
        } elseif (isset($filters['days'])) {
            $query->where('timestamp', '>=', now()->subDays($filters['days']));
        } else {
            $query->where('timestamp', '>=', now()->subDays(self::DEFAULT_DAYS));
        }

        // Apply crime type filter
        if (isset($filters['crime_type_id'])) {
            $query->where('crime_type_id', $filters['crime_type_id']);
        }

        if (isset($filters['crime_category_id'])) {
            $query->whereHas('crimeType', function ($q) use ($filters) {
                $q->where('category_id', $filters['crime_category_id']);
            });
        }

        // Aggregate by region
        $results = $query
            ->select('region_id')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('AVG(confidence_score) as avg_confidence')
            ->groupBy('region_id')
            ->with('region:id,name,code,boundary')
            ->get();

        $maxCount = $results->max('count') ?: 1;
        $regions = [];

        foreach ($results as $result) {
            if (!$result->region) {
                continue;
            }

            $intensity = $result->count / $maxCount;

            $regions[] = [
                'region_id' => $result->region_id,
                'region_name' => $result->region->name,
                'region_code' => $result->region->code,
                'count' => (int) $result->count,
                'intensity' => round($intensity, 4),
                'avg_confidence' => round($result->avg_confidence, 2),
            ];
        }

        return [
            'regions' => $regions,
            'total_occurrences' => $results->sum('count'),
            'filters' => $filters,
        ];
    }

    /**
     * Get occurrence distribution by crime type for heatmap legend.
     */
    public function getDistributionByCrimeType(array $bounds = [], array $filters = []): array
    {
        $query = Occurrence::query()
            ->where('status', OccurrenceStatus::ACTIVE);

        // Apply bounding box
        if (count($bounds) === 4) {
            [$minLat, $minLng, $maxLat, $maxLng] = $bounds;
            $query->whereRaw(
                'ST_Within(location, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
                [$minLng, $minLat, $maxLng, $maxLat]
            );
        }

        // Apply time filters
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('timestamp', [
                $filters['start_date'],
                $filters['end_date']
            ]);
        } elseif (isset($filters['days'])) {
            $query->where('timestamp', '>=', now()->subDays($filters['days']));
        } else {
            $query->where('timestamp', '>=', now()->subDays(self::DEFAULT_DAYS));
        }

        $results = $query
            ->select('crime_type_id')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('crime_type_id')
            ->with('crimeType:id,name,category_id')
            ->orderByDesc('count')
            ->get();

        $total = $results->sum('count') ?: 1;
        $distribution = [];

        foreach ($results as $result) {
            $distribution[] = [
                'crime_type_id' => $result->crime_type_id,
                'crime_type_name' => $result->crimeType?->name ?? 'Unknown',
                'count' => (int) $result->count,
                'percentage' => round(($result->count / $total) * 100, 2),
            ];
        }

        return [
            'distribution' => $distribution,
            'total' => $total,
        ];
    }

    /**
     * Clear heatmap cache for a specific region or all.
     */
    public function clearCache(?int $regionId = null): void
    {
        if ($regionId !== null) {
            // Clear specific region cache
            Cache::forget("heatmap:region:{$regionId}");
        }

        // Clear general heatmap caches
        // Note: In production, use cache tags for more efficient clearing
        Cache::forget('heatmap:by_region:' . md5(json_encode([])));
    }

    /**
     * Build cache key for heatmap data.
     */
    protected function buildCacheKey(array $bounds, array $filters, int $zoom): string
    {
        $key = 'heatmap:' . md5(json_encode([
            'bounds' => $bounds,
            'filters' => $filters,
            'zoom' => $zoom,
        ]));

        return $key;
    }
}
