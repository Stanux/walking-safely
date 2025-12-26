<?php

namespace App\Services;

use App\Enums\OccurrenceStatus;
use App\Models\Occurrence;
use App\Models\Region;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Service for generating time series data from occurrences.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
class TimeSeriesService
{
    /**
     * Cache TTL for time series data in seconds (5 minutes).
     */
    public const CACHE_TTL = 300;

    /**
     * Supported granularity levels.
     */
    public const GRANULARITY_HOUR = 'hour';
    public const GRANULARITY_DAY = 'day';
    public const GRANULARITY_WEEK = 'week';
    public const GRANULARITY_MONTH = 'month';

    /**
     * Valid granularity values.
     */
    public const VALID_GRANULARITIES = [
        self::GRANULARITY_HOUR,
        self::GRANULARITY_DAY,
        self::GRANULARITY_WEEK,
        self::GRANULARITY_MONTH,
    ];

    /**
     * Get time series data for occurrences.
     * Requirement 11.1: Display line chart showing occurrence count by period.
     *
     * @param array $filters Filters (region_id, crime_type_id, start_date, end_date)
     * @param string $granularity Temporal granularity (hour, day, week, month)
     * @return array Time series data
     */
    public function getTimeSeries(array $filters = [], string $granularity = self::GRANULARITY_DAY): array
    {
        // Validate granularity (Requirement 11.3)
        $granularity = $this->validateGranularity($granularity);

        $cacheKey = $this->buildCacheKey($filters, $granularity);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters, $granularity) {
            return $this->generateTimeSeries($filters, $granularity);
        });
    }

    /**
     * Validate and normalize granularity value.
     * Requirement 11.3: Support hour, day, week, month granularity.
     */
    public function validateGranularity(string $granularity): string
    {
        $granularity = strtolower(trim($granularity));

        if (!in_array($granularity, self::VALID_GRANULARITIES)) {
            return self::GRANULARITY_DAY; // Default fallback
        }

        return $granularity;
    }

    /**
     * Generate time series data.
     */
    protected function generateTimeSeries(array $filters, string $granularity): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Get date format and grouping based on granularity
        $dateFormat = $this->getDateFormat($granularity);
        $truncateFunction = $this->getTruncateFunction($granularity);

        // Aggregate by time period
        $results = $query
            ->selectRaw("{$truncateFunction} as period")
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('AVG(confidence_score) as avg_confidence')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        // Transform to time series format
        $series = [];
        foreach ($results as $result) {
            $series[] = [
                'period' => $result->period,
                'count' => (int) $result->count,
                'avg_confidence' => round($result->avg_confidence ?? 0, 2),
            ];
        }

        return [
            'series' => $series,
            'granularity' => $granularity,
            'total_occurrences' => $results->sum('count'),
            'filters' => $filters,
        ];
    }

    /**
     * Build the base occurrence query with filters.
     * Requirement 11.2: Filter by region and crime type.
     */
    protected function buildOccurrenceQuery(array $filters): \Illuminate\Database\Eloquent\Builder
    {
        $query = Occurrence::query()
            ->where('status', OccurrenceStatus::ACTIVE);

        // Filter by region (Requirement 11.2)
        if (isset($filters['region_id'])) {
            $query->where('region_id', $filters['region_id']);
        }

        // Filter by multiple regions (for custom polygon selection)
        if (isset($filters['region_ids']) && is_array($filters['region_ids'])) {
            $query->whereIn('region_id', $filters['region_ids']);
        }

        // Filter by crime type (Requirement 11.2)
        if (isset($filters['crime_type_id'])) {
            $query->where('crime_type_id', $filters['crime_type_id']);
        }

        // Filter by crime category
        if (isset($filters['crime_category_id'])) {
            $query->whereHas('crimeType', function ($q) use ($filters) {
                $q->where('category_id', $filters['crime_category_id']);
            });
        }

        // Filter by date range
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('timestamp', [
                $filters['start_date'],
                $filters['end_date']
            ]);
        } elseif (isset($filters['days'])) {
            $query->where('timestamp', '>=', now()->subDays($filters['days']));
        }

        return $query;
    }

    /**
     * Get SQL date format for the given granularity.
     */
    protected function getDateFormat(string $granularity): string
    {
        return match ($granularity) {
            self::GRANULARITY_HOUR => 'YYYY-MM-DD HH24:00:00',
            self::GRANULARITY_DAY => 'YYYY-MM-DD',
            self::GRANULARITY_WEEK => 'IYYY-IW', // ISO week
            self::GRANULARITY_MONTH => 'YYYY-MM',
            default => 'YYYY-MM-DD',
        };
    }

    /**
     * Get SQL truncate function for the given granularity.
     */
    protected function getTruncateFunction(string $granularity): string
    {
        return match ($granularity) {
            self::GRANULARITY_HOUR => "DATE_TRUNC('hour', timestamp)",
            self::GRANULARITY_DAY => "DATE_TRUNC('day', timestamp)",
            self::GRANULARITY_WEEK => "DATE_TRUNC('week', timestamp)",
            self::GRANULARITY_MONTH => "DATE_TRUNC('month', timestamp)",
            default => "DATE_TRUNC('day', timestamp)",
        };
    }

    /**
     * Get hourly pattern analysis.
     * Requirement 11.4: Show concentration by hour of day and day of week.
     *
     * @param array $filters Filters (region_id, crime_type_id, start_date, end_date)
     * @return array Hourly pattern data
     */
    public function getHourlyPattern(array $filters = []): array
    {
        $cacheKey = 'timeseries:hourly:' . md5(json_encode($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            return $this->generateHourlyPattern($filters);
        });
    }

    /**
     * Generate hourly pattern data.
     */
    protected function generateHourlyPattern(array $filters): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Aggregate by hour of day
        $results = $query
            ->selectRaw('EXTRACT(HOUR FROM timestamp) as hour')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Fill in missing hours with zero
        $hourlyData = array_fill(0, 24, 0);
        foreach ($results as $result) {
            $hourlyData[(int) $result->hour] = (int) $result->count;
        }

        // Transform to array format
        $pattern = [];
        for ($hour = 0; $hour < 24; $hour++) {
            $pattern[] = [
                'hour' => $hour,
                'label' => sprintf('%02d:00', $hour),
                'count' => $hourlyData[$hour],
            ];
        }

        return [
            'pattern' => $pattern,
            'peak_hour' => array_search(max($hourlyData), $hourlyData),
            'total' => array_sum($hourlyData),
            'filters' => $filters,
        ];
    }

    /**
     * Get day of week pattern analysis.
     * Requirement 11.4: Show concentration by day of week.
     *
     * @param array $filters Filters (region_id, crime_type_id, start_date, end_date)
     * @return array Day of week pattern data
     */
    public function getDayOfWeekPattern(array $filters = []): array
    {
        $cacheKey = 'timeseries:dow:' . md5(json_encode($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            return $this->generateDayOfWeekPattern($filters);
        });
    }

    /**
     * Generate day of week pattern data.
     */
    protected function generateDayOfWeekPattern(array $filters): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Aggregate by day of week (0 = Sunday, 6 = Saturday in PostgreSQL)
        $results = $query
            ->selectRaw('EXTRACT(DOW FROM timestamp) as dow')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('dow')
            ->orderBy('dow')
            ->get();

        // Day names
        $dayNames = [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
        ];

        // Fill in missing days with zero
        $dowData = array_fill(0, 7, 0);
        foreach ($results as $result) {
            $dowData[(int) $result->dow] = (int) $result->count;
        }

        // Transform to array format
        $pattern = [];
        for ($dow = 0; $dow < 7; $dow++) {
            $pattern[] = [
                'day_of_week' => $dow,
                'day_name' => $dayNames[$dow],
                'count' => $dowData[$dow],
            ];
        }

        return [
            'pattern' => $pattern,
            'peak_day' => $dayNames[array_search(max($dowData), $dowData)],
            'total' => array_sum($dowData),
            'filters' => $filters,
        ];
    }

    /**
     * Get combined hour and day of week heatmap data.
     * Requirement 11.4: Show concentration by hour of day and day of week.
     *
     * @param array $filters Filters
     * @return array Combined pattern data
     */
    public function getHourDayHeatmap(array $filters = []): array
    {
        $cacheKey = 'timeseries:hour_day:' . md5(json_encode($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            return $this->generateHourDayHeatmap($filters);
        });
    }

    /**
     * Generate hour/day heatmap data.
     */
    protected function generateHourDayHeatmap(array $filters): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Aggregate by hour and day of week
        $results = $query
            ->selectRaw('EXTRACT(DOW FROM timestamp) as dow')
            ->selectRaw('EXTRACT(HOUR FROM timestamp) as hour')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('dow', 'hour')
            ->get();

        // Initialize 7x24 matrix
        $matrix = [];
        for ($dow = 0; $dow < 7; $dow++) {
            $matrix[$dow] = array_fill(0, 24, 0);
        }

        // Fill matrix with data
        $maxCount = 0;
        foreach ($results as $result) {
            $count = (int) $result->count;
            $matrix[(int) $result->dow][(int) $result->hour] = $count;
            $maxCount = max($maxCount, $count);
        }

        // Day names
        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Transform to heatmap format
        $heatmap = [];
        for ($dow = 0; $dow < 7; $dow++) {
            for ($hour = 0; $hour < 24; $hour++) {
                $count = $matrix[$dow][$hour];
                $heatmap[] = [
                    'day_of_week' => $dow,
                    'day_name' => $dayNames[$dow],
                    'hour' => $hour,
                    'count' => $count,
                    'intensity' => $maxCount > 0 ? round($count / $maxCount, 4) : 0,
                ];
            }
        }

        return [
            'heatmap' => $heatmap,
            'max_count' => $maxCount,
            'filters' => $filters,
        ];
    }

    /**
     * Get time series comparison between two periods.
     *
     * @param array $filters Base filters
     * @param string $period1Start Start of first period
     * @param string $period1End End of first period
     * @param string $period2Start Start of second period
     * @param string $period2End End of second period
     * @param string $granularity Temporal granularity
     * @return array Comparison data
     */
    public function comparePeriods(
        array $filters,
        string $period1Start,
        string $period1End,
        string $period2Start,
        string $period2End,
        string $granularity = self::GRANULARITY_DAY
    ): array {
        $filters1 = array_merge($filters, [
            'start_date' => $period1Start,
            'end_date' => $period1End,
        ]);

        $filters2 = array_merge($filters, [
            'start_date' => $period2Start,
            'end_date' => $period2End,
        ]);

        $series1 = $this->getTimeSeries($filters1, $granularity);
        $series2 = $this->getTimeSeries($filters2, $granularity);

        $total1 = $series1['total_occurrences'];
        $total2 = $series2['total_occurrences'];

        $percentChange = $total1 > 0 
            ? round((($total2 - $total1) / $total1) * 100, 2) 
            : ($total2 > 0 ? 100 : 0);

        return [
            'period1' => [
                'start' => $period1Start,
                'end' => $period1End,
                'series' => $series1['series'],
                'total' => $total1,
            ],
            'period2' => [
                'start' => $period2Start,
                'end' => $period2End,
                'series' => $series2['series'],
                'total' => $total2,
            ],
            'comparison' => [
                'absolute_change' => $total2 - $total1,
                'percent_change' => $percentChange,
                'trend' => $percentChange > 0 ? 'increasing' : ($percentChange < 0 ? 'decreasing' : 'stable'),
            ],
            'granularity' => $granularity,
        ];
    }

    /**
     * Clear time series cache.
     */
    public function clearCache(): void
    {
        // Note: In production, use cache tags for more efficient clearing
        // For now, we rely on TTL expiration
    }

    /**
     * Build cache key for time series data.
     */
    protected function buildCacheKey(array $filters, string $granularity): string
    {
        return 'timeseries:' . md5(json_encode([
            'filters' => $filters,
            'granularity' => $granularity,
        ]));
    }
}
