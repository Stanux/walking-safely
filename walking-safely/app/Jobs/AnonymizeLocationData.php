<?php

namespace App\Jobs;

use App\Models\AuditLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Job to anonymize location data for statistical analysis.
 *
 * @see Requirement 15.2 - Avoid storing location history associated with user identification
 * @see Requirement 15.4 - Aggregate and anonymize location data before using for statistical analysis
 */
class AnonymizeLocationData implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of days after which data should be anonymized.
     */
    public const ANONYMIZATION_THRESHOLD_DAYS = 7;

    /**
     * The minimum number of records required for aggregation to maintain anonymity.
     */
    public const MIN_AGGREGATION_COUNT = 5;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ?string $regionId = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('Starting location data anonymization', [
            'region_id' => $this->regionId,
        ]);

        try {
            DB::beginTransaction();

            // Anonymize navigation session data
            $this->anonymizeNavigationSessions();

            // Anonymize occurrence data (remove user association from old records)
            $this->anonymizeOccurrenceData();

            // Create aggregated statistics
            $this->createAggregatedStatistics();

            DB::commit();

            Log::info('Location data anonymization completed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Location data anonymization failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Anonymize navigation session data by removing user associations.
     *
     * @see Requirement 15.2 - Avoid storing location history associated with user identification
     */
    protected function anonymizeNavigationSessions(): void
    {
        $threshold = now()->subDays(self::ANONYMIZATION_THRESHOLD_DAYS);

        $affected = DB::table('navigation_sessions')
            ->where('created_at', '<', $threshold)
            ->whereNotNull('user_id')
            ->update([
                'user_id' => null,
                'current_position' => null,
                'updated_at' => now(),
            ]);

        Log::info('Anonymized navigation sessions', ['count' => $affected]);
    }

    /**
     * Anonymize occurrence data by removing user associations from old records.
     *
     * @see Requirement 15.2 - Avoid storing location history associated with user identification
     */
    protected function anonymizeOccurrenceData(): void
    {
        $threshold = now()->subDays(self::ANONYMIZATION_THRESHOLD_DAYS);

        $affected = DB::table('occurrences')
            ->where('created_at', '<', $threshold)
            ->whereNotNull('created_by')
            ->update([
                'created_by' => null,
                'updated_at' => now(),
            ]);

        Log::info('Anonymized occurrence data', ['count' => $affected]);
    }

    /**
     * Create aggregated statistics from location data.
     *
     * @see Requirement 15.4 - Aggregate and anonymize location data before using for statistical analysis
     */
    protected function createAggregatedStatistics(): void
    {
        // Aggregate occurrence counts by region and crime type
        $this->aggregateOccurrencesByRegion();

        // Aggregate temporal patterns
        $this->aggregateTemporalPatterns();
    }

    /**
     * Aggregate occurrence counts by region.
     */
    protected function aggregateOccurrencesByRegion(): void
    {
        $threshold = now()->subDays(self::ANONYMIZATION_THRESHOLD_DAYS);

        // Get aggregated data by region
        $aggregations = DB::table('occurrences')
            ->select([
                'region_id',
                'crime_type_id',
                DB::raw('COUNT(*) as occurrence_count'),
                DB::raw('AVG(confidence_score) as avg_confidence'),
            ])
            ->where('created_at', '<', $threshold)
            ->whereNotNull('region_id')
            ->groupBy('region_id', 'crime_type_id')
            ->having(DB::raw('COUNT(*)'), '>=', self::MIN_AGGREGATION_COUNT)
            ->get();

        foreach ($aggregations as $aggregation) {
            // Store aggregated data (could be in a separate aggregated_statistics table)
            Log::debug('Aggregated region statistics', [
                'region_id' => $aggregation->region_id,
                'crime_type_id' => $aggregation->crime_type_id,
                'count' => $aggregation->occurrence_count,
                'avg_confidence' => $aggregation->avg_confidence,
            ]);
        }
    }

    /**
     * Aggregate temporal patterns for statistical analysis.
     */
    protected function aggregateTemporalPatterns(): void
    {
        $threshold = now()->subDays(self::ANONYMIZATION_THRESHOLD_DAYS);

        // Aggregate by hour of day
        $hourlyPatterns = DB::table('occurrences')
            ->select([
                DB::raw('EXTRACT(HOUR FROM timestamp) as hour_of_day'),
                DB::raw('COUNT(*) as occurrence_count'),
            ])
            ->where('created_at', '<', $threshold)
            ->groupBy(DB::raw('EXTRACT(HOUR FROM timestamp)'))
            ->having(DB::raw('COUNT(*)'), '>=', self::MIN_AGGREGATION_COUNT)
            ->get();

        foreach ($hourlyPatterns as $pattern) {
            Log::debug('Aggregated hourly pattern', [
                'hour' => $pattern->hour_of_day,
                'count' => $pattern->occurrence_count,
            ]);
        }

        // Aggregate by day of week
        $dailyPatterns = DB::table('occurrences')
            ->select([
                DB::raw('EXTRACT(DOW FROM timestamp) as day_of_week'),
                DB::raw('COUNT(*) as occurrence_count'),
            ])
            ->where('created_at', '<', $threshold)
            ->groupBy(DB::raw('EXTRACT(DOW FROM timestamp)'))
            ->having(DB::raw('COUNT(*)'), '>=', self::MIN_AGGREGATION_COUNT)
            ->get();

        foreach ($dailyPatterns as $pattern) {
            Log::debug('Aggregated daily pattern', [
                'day' => $pattern->day_of_week,
                'count' => $pattern->occurrence_count,
            ]);
        }
    }
}
