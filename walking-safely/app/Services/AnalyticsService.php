<?php

namespace App\Services;

use App\Enums\ModerationStatus;
use App\Enums\OccurrenceSource;
use App\Enums\OccurrenceStatus;
use App\Models\CrimeCategory;
use App\Models\CrimeType;
use App\Models\ModerationQueue;
use App\Models\Occurrence;
use App\Models\Region;
use App\Models\RiskIndex;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Service for generating analytics and dashboard data.
 * 
 * Requirements:
 * - 20.1: Dashboard with management indicators (total occurrences, distribution by type/region, temporal trends)
 * - 20.4: Data quality metrics (average confidence score by source, deduplication rate)
 */
class AnalyticsService
{
    /**
     * Cache TTL for dashboard data in seconds (15 minutes).
     * Requirement 20.2: Data updated with maximum 15 minute delay.
     */
    public const CACHE_TTL = 900;

    /**
     * Get complete dashboard data.
     * Requirement 20.1: Dashboard with management indicators.
     *
     * @param array $filters Optional filters (start_date, end_date, region_id)
     * @return array Dashboard data
     */
    public function getDashboardData(array $filters = []): array
    {
        $cacheKey = 'analytics:dashboard:' . md5(json_encode($filters));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($filters) {
            return [
                'summary' => $this->getSummaryMetrics($filters),
                'distribution_by_type' => $this->getDistributionByCrimeType($filters),
                'distribution_by_region' => $this->getDistributionByRegion($filters),
                'temporal_trends' => $this->getTemporalTrends($filters),
                'data_quality' => $this->getDataQualityMetrics($filters),
                'moderation_stats' => $this->getModerationStatistics($filters),
                'generated_at' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Get summary metrics.
     * Requirement 20.1: Total occurrences and key indicators.
     */
    public function getSummaryMetrics(array $filters = []): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        $totalOccurrences = $query->count();
        $activeOccurrences = (clone $query)->where('status', OccurrenceStatus::ACTIVE)->count();
        
        $collaborativeCount = (clone $query)->where('source', OccurrenceSource::COLLABORATIVE)->count();
        $officialCount = (clone $query)->where('source', OccurrenceSource::OFFICIAL)->count();

        // Calculate averages
        $avgConfidence = (clone $query)->avg('confidence_score') ?? 0;

        // High risk regions count
        $highRiskRegions = RiskIndex::where('value', '>=', RiskIndex::HIGH_RISK_THRESHOLD)->count();

        // Users count
        $totalUsers = User::count();
        $activeUsers = User::where('updated_at', '>=', now()->subDays(30))->count();

        return [
            'total_occurrences' => $totalOccurrences,
            'active_occurrences' => $activeOccurrences,
            'collaborative_occurrences' => $collaborativeCount,
            'official_occurrences' => $officialCount,
            'average_confidence_score' => round($avgConfidence, 2),
            'high_risk_regions' => $highRiskRegions,
            'total_users' => $totalUsers,
            'active_users_30d' => $activeUsers,
        ];
    }

    /**
     * Get distribution by crime type.
     * Requirement 20.1: Distribution by type.
     */
    public function getDistributionByCrimeType(array $filters = []): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        $results = $query
            ->select('crime_type_id')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('crime_type_id')
            ->orderByDesc('count')
            ->limit(20)
            ->get();

        $total = $results->sum('count') ?: 1;
        $distribution = [];

        foreach ($results as $result) {
            $crimeType = CrimeType::find($result->crime_type_id);
            $distribution[] = [
                'crime_type_id' => $result->crime_type_id,
                'crime_type_name' => $crimeType?->name ?? 'Unknown',
                'category_name' => $crimeType?->category?->name ?? 'Unknown',
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
     * Get distribution by region.
     * Requirement 20.1: Distribution by region.
     */
    public function getDistributionByRegion(array $filters = []): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        $results = $query
            ->select('region_id')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('AVG(confidence_score) as avg_confidence')
            ->whereNotNull('region_id')
            ->groupBy('region_id')
            ->orderByDesc('count')
            ->limit(20)
            ->get();

        $total = $results->sum('count') ?: 1;
        $distribution = [];

        foreach ($results as $result) {
            $region = Region::find($result->region_id);
            $riskIndex = RiskIndex::where('region_id', $result->region_id)->first();

            $distribution[] = [
                'region_id' => $result->region_id,
                'region_name' => $region?->name ?? 'Unknown',
                'region_code' => $region?->code ?? null,
                'count' => (int) $result->count,
                'percentage' => round(($result->count / $total) * 100, 2),
                'avg_confidence' => round($result->avg_confidence ?? 0, 2),
                'risk_index' => $riskIndex?->value ?? 0,
            ];
        }

        return [
            'distribution' => $distribution,
            'total' => $total,
        ];
    }

    /**
     * Get temporal trends.
     * Requirement 20.1: Temporal trends.
     */
    public function getTemporalTrends(array $filters = []): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Daily trend for last 30 days
        $dailyTrend = (clone $query)
            ->where('timestamp', '>=', now()->subDays(30))
            ->selectRaw("DATE_TRUNC('day', timestamp) as period")
            ->selectRaw('COUNT(*) as count')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($item) => [
                'period' => $item->period,
                'count' => (int) $item->count,
            ])
            ->toArray();

        // Weekly trend for last 12 weeks
        $weeklyTrend = (clone $query)
            ->where('timestamp', '>=', now()->subWeeks(12))
            ->selectRaw("DATE_TRUNC('week', timestamp) as period")
            ->selectRaw('COUNT(*) as count')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($item) => [
                'period' => $item->period,
                'count' => (int) $item->count,
            ])
            ->toArray();

        // Monthly trend for last 12 months
        $monthlyTrend = (clone $query)
            ->where('timestamp', '>=', now()->subMonths(12))
            ->selectRaw("DATE_TRUNC('month', timestamp) as period")
            ->selectRaw('COUNT(*) as count')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($item) => [
                'period' => $item->period,
                'count' => (int) $item->count,
            ])
            ->toArray();

        // Calculate trend direction
        $currentMonth = (clone $query)
            ->where('timestamp', '>=', now()->startOfMonth())
            ->count();
        $lastMonth = (clone $query)
            ->whereBetween('timestamp', [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()])
            ->count();

        $trendDirection = 'stable';
        $trendPercentage = 0;
        if ($lastMonth > 0) {
            $trendPercentage = round((($currentMonth - $lastMonth) / $lastMonth) * 100, 2);
            $trendDirection = $trendPercentage > 5 ? 'increasing' : ($trendPercentage < -5 ? 'decreasing' : 'stable');
        }

        return [
            'daily' => $dailyTrend,
            'weekly' => $weeklyTrend,
            'monthly' => $monthlyTrend,
            'trend' => [
                'direction' => $trendDirection,
                'percentage' => $trendPercentage,
                'current_month' => $currentMonth,
                'last_month' => $lastMonth,
            ],
        ];
    }

    /**
     * Get data quality metrics.
     * Requirement 20.4: Data quality metrics including confidence score by source and deduplication rate.
     */
    public function getDataQualityMetrics(array $filters = []): array
    {
        $query = $this->buildOccurrenceQuery($filters);

        // Average confidence score by source
        $confidenceBySource = (clone $query)
            ->select('source')
            ->selectRaw('AVG(confidence_score) as avg_confidence')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('source')
            ->get()
            ->mapWithKeys(fn($item) => [
                $item->source?->value ?? 'unknown' => [
                    'avg_confidence' => round($item->avg_confidence ?? 0, 2),
                    'count' => (int) $item->count,
                ]
            ])
            ->toArray();

        // Deduplication statistics
        $totalOccurrences = (clone $query)->count();
        $mergedOccurrences = (clone $query)->where('status', OccurrenceStatus::MERGED)->count();
        $deduplicationRate = $totalOccurrences > 0 
            ? round(($mergedOccurrences / $totalOccurrences) * 100, 2) 
            : 0;

        // Expired occurrences
        $expiredOccurrences = (clone $query)->where('status', OccurrenceStatus::EXPIRED)->count();
        $rejectedOccurrences = (clone $query)->where('status', OccurrenceStatus::REJECTED)->count();

        // Confidence score distribution
        $confidenceDistribution = (clone $query)
            ->select('confidence_score')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('confidence_score')
            ->orderBy('confidence_score')
            ->get()
            ->mapWithKeys(fn($item) => [
                (string) $item->confidence_score => (int) $item->count
            ])
            ->toArray();

        // Data completeness (occurrences with all required fields)
        $completeOccurrences = (clone $query)
            ->whereNotNull('crime_type_id')
            ->whereNotNull('region_id')
            ->whereNotNull('severity')
            ->count();
        $completenessRate = $totalOccurrences > 0 
            ? round(($completeOccurrences / $totalOccurrences) * 100, 2) 
            : 0;

        return [
            'confidence_by_source' => $confidenceBySource,
            'deduplication' => [
                'total_occurrences' => $totalOccurrences,
                'merged_occurrences' => $mergedOccurrences,
                'deduplication_rate' => $deduplicationRate,
            ],
            'status_breakdown' => [
                'active' => (clone $query)->where('status', OccurrenceStatus::ACTIVE)->count(),
                'expired' => $expiredOccurrences,
                'rejected' => $rejectedOccurrences,
                'merged' => $mergedOccurrences,
            ],
            'confidence_distribution' => $confidenceDistribution,
            'data_completeness' => [
                'complete_occurrences' => $completeOccurrences,
                'completeness_rate' => $completenessRate,
            ],
        ];
    }


    /**
     * Get moderation statistics.
     */
    public function getModerationStatistics(array $filters = []): array
    {
        $pendingCount = ModerationQueue::pending()->count();
        $approvedCount = ModerationQueue::approved()->count();
        $rejectedCount = ModerationQueue::rejected()->count();
        $totalModerated = $approvedCount + $rejectedCount;

        // Average moderation time
        $avgModerationTime = ModerationQueue::whereNotNull('moderated_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (moderated_at - created_at))) as avg_seconds')
            ->value('avg_seconds');

        // Moderation by reason
        $byReason = ModerationQueue::select('reason')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('reason')
            ->get()
            ->mapWithKeys(fn($item) => [
                $item->reason?->value ?? 'unknown' => (int) $item->count
            ])
            ->toArray();

        return [
            'pending' => $pendingCount,
            'approved' => $approvedCount,
            'rejected' => $rejectedCount,
            'total_moderated' => $totalModerated,
            'approval_rate' => $totalModerated > 0 
                ? round(($approvedCount / $totalModerated) * 100, 2) 
                : 0,
            'avg_moderation_time_hours' => $avgModerationTime 
                ? round($avgModerationTime / 3600, 2) 
                : null,
            'by_reason' => $byReason,
        ];
    }

    /**
     * Export dashboard data to CSV format.
     * Requirement 20.3: Export reports in CSV format.
     *
     * @param array $filters Optional filters
     * @param string $type Export type (occurrences, summary, distribution)
     * @return string CSV content
     */
    public function exportToCsv(array $filters = [], string $type = 'occurrences'): string
    {
        return match ($type) {
            'occurrences' => $this->exportOccurrencesToCsv($filters),
            'summary' => $this->exportSummaryToCsv($filters),
            'distribution' => $this->exportDistributionToCsv($filters),
            default => $this->exportOccurrencesToCsv($filters),
        };
    }

    /**
     * Export occurrences to CSV.
     */
    protected function exportOccurrencesToCsv(array $filters): string
    {
        $query = $this->buildOccurrenceQuery($filters);
        $occurrences = $query->with(['crimeType', 'region'])->limit(10000)->get();

        $csv = "ID,Timestamp,Crime Type,Category,Severity,Confidence Score,Source,Region,Status\n";

        foreach ($occurrences as $occurrence) {
            $csv .= sprintf(
                "%d,%s,%s,%s,%s,%d,%s,%s,%s\n",
                $occurrence->id,
                $occurrence->timestamp?->toIso8601String() ?? '',
                $this->escapeCsv($occurrence->crimeType?->name ?? 'Unknown'),
                $this->escapeCsv($occurrence->crimeType?->category?->name ?? 'Unknown'),
                $occurrence->severity?->value ?? '',
                $occurrence->confidence_score ?? 0,
                $occurrence->source?->value ?? '',
                $this->escapeCsv($occurrence->region?->name ?? 'Unknown'),
                $occurrence->status?->value ?? ''
            );
        }

        return $csv;
    }

    /**
     * Export summary to CSV.
     */
    protected function exportSummaryToCsv(array $filters): string
    {
        $summary = $this->getSummaryMetrics($filters);

        $csv = "Metric,Value\n";
        foreach ($summary as $key => $value) {
            $csv .= sprintf("%s,%s\n", $this->escapeCsv($key), $value);
        }

        return $csv;
    }

    /**
     * Export distribution to CSV.
     */
    protected function exportDistributionToCsv(array $filters): string
    {
        $distribution = $this->getDistributionByCrimeType($filters);

        $csv = "Crime Type,Category,Count,Percentage\n";
        foreach ($distribution['distribution'] as $item) {
            $csv .= sprintf(
                "%s,%s,%d,%.2f%%\n",
                $this->escapeCsv($item['crime_type_name']),
                $this->escapeCsv($item['category_name']),
                $item['count'],
                $item['percentage']
            );
        }

        return $csv;
    }

    /**
     * Export dashboard data to PDF format.
     * Requirement 20.3: Export reports in PDF format.
     *
     * @param array $filters Optional filters
     * @return array PDF-ready data structure
     */
    public function exportToPdfData(array $filters = []): array
    {
        $dashboard = $this->getDashboardData($filters);

        return [
            'title' => 'Walking Safely - Analytics Report',
            'generated_at' => now()->toIso8601String(),
            'filters' => $filters,
            'summary' => $dashboard['summary'],
            'distribution_by_type' => array_slice($dashboard['distribution_by_type']['distribution'], 0, 10),
            'distribution_by_region' => array_slice($dashboard['distribution_by_region']['distribution'], 0, 10),
            'trends' => [
                'direction' => $dashboard['temporal_trends']['trend']['direction'],
                'percentage' => $dashboard['temporal_trends']['trend']['percentage'],
            ],
            'data_quality' => [
                'completeness_rate' => $dashboard['data_quality']['data_completeness']['completeness_rate'],
                'deduplication_rate' => $dashboard['data_quality']['deduplication']['deduplication_rate'],
            ],
            'moderation' => [
                'pending' => $dashboard['moderation_stats']['pending'],
                'approval_rate' => $dashboard['moderation_stats']['approval_rate'],
            ],
        ];
    }

    /**
     * Build base occurrence query with filters.
     */
    protected function buildOccurrenceQuery(array $filters): \Illuminate\Database\Eloquent\Builder
    {
        $query = Occurrence::query();

        // Filter by date range
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('timestamp', [
                $filters['start_date'],
                $filters['end_date']
            ]);
        } elseif (isset($filters['days'])) {
            $query->where('timestamp', '>=', now()->subDays($filters['days']));
        }

        // Filter by region
        if (isset($filters['region_id'])) {
            $query->where('region_id', $filters['region_id']);
        }

        // Filter by crime type
        if (isset($filters['crime_type_id'])) {
            $query->where('crime_type_id', $filters['crime_type_id']);
        }

        // Filter by source
        if (isset($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        // Filter by status
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query;
    }

    /**
     * Escape a value for CSV output.
     */
    protected function escapeCsv(string $value): string
    {
        // If the value contains comma, newline, or quote, wrap in quotes
        if (preg_match('/[,"\n\r]/', $value)) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }

    /**
     * Clear analytics cache.
     */
    public function clearCache(): void
    {
        Cache::forget('analytics:dashboard:' . md5(json_encode([])));
    }
}
