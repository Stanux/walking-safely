<?php

namespace App\Services;

use App\Jobs\AnonymizeLocationData;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service for data anonymization and privacy compliance.
 *
 * @see Requirement 15.2 - Avoid storing location history associated with user identification
 * @see Requirement 15.4 - Aggregate and anonymize location data before using for statistical analysis
 */
class DataAnonymizationService
{
    /**
     * Dispatch the anonymization job.
     */
    public function dispatchAnonymization(?string $regionId = null): void
    {
        AnonymizeLocationData::dispatch($regionId);
    }

    /**
     * Anonymize a specific user's data immediately.
     *
     * @see Requirement 15.2 - Avoid storing location history associated with user identification
     */
    public function anonymizeUserData(User $user): array
    {
        $results = [
            'navigation_sessions' => 0,
            'occurrences' => 0,
        ];

        try {
            DB::beginTransaction();

            // Anonymize navigation sessions
            $results['navigation_sessions'] = DB::table('navigation_sessions')
                ->where('user_id', $user->id)
                ->update([
                    'user_id' => null,
                    'current_position' => null,
                    'updated_at' => now(),
                ]);

            // Anonymize occurrences (keep the occurrence but remove user association)
            $results['occurrences'] = DB::table('occurrences')
                ->where('created_by', $user->id)
                ->update([
                    'created_by' => null,
                    'updated_at' => now(),
                ]);

            DB::commit();

            $this->logAnonymization($user, $results);

            Log::info('User data anonymized', [
                'user_id' => $user->id,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('User data anonymization failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $results;
    }

    /**
     * Get anonymized aggregate statistics for a region.
     *
     * @see Requirement 15.4 - Aggregate and anonymize location data before using for statistical analysis
     */
    public function getAnonymizedRegionStatistics(string $regionId): array
    {
        $minCount = AnonymizeLocationData::MIN_AGGREGATION_COUNT;

        // Get occurrence counts by crime type (only if count >= minimum for anonymity)
        $crimeStats = DB::table('occurrences')
            ->select([
                'crime_type_id',
                DB::raw('COUNT(*) as count'),
                DB::raw('AVG(confidence_score) as avg_confidence'),
            ])
            ->where('region_id', $regionId)
            ->groupBy('crime_type_id')
            ->having(DB::raw('COUNT(*)'), '>=', $minCount)
            ->get()
            ->toArray();

        // Get temporal distribution (only if count >= minimum for anonymity)
        $temporalStats = DB::table('occurrences')
            ->select([
                DB::raw('EXTRACT(HOUR FROM timestamp) as hour'),
                DB::raw('COUNT(*) as count'),
            ])
            ->where('region_id', $regionId)
            ->groupBy(DB::raw('EXTRACT(HOUR FROM timestamp)'))
            ->having(DB::raw('COUNT(*)'), '>=', $minCount)
            ->get()
            ->toArray();

        return [
            'region_id' => $regionId,
            'crime_statistics' => $crimeStats,
            'temporal_distribution' => $temporalStats,
            'anonymization_threshold' => $minCount,
        ];
    }

    /**
     * Check if data can be safely aggregated (meets minimum count threshold).
     */
    public function canSafelyAggregate(int $count): bool
    {
        return $count >= AnonymizeLocationData::MIN_AGGREGATION_COUNT;
    }

    /**
     * Log anonymization action to audit log.
     */
    protected function logAnonymization(User $user, array $results): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'data_anonymized',
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [
                'results' => $results,
                'timestamp' => now()->toIso8601String(),
            ],
            'ip_address' => request()->ip(),
        ]);
    }
}
