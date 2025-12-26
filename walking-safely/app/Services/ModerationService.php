<?php

namespace App\Services;

use App\Enums\ModerationReason;
use App\Enums\ModerationStatus;
use App\Enums\OccurrenceSource;
use App\Models\AuditLog;
use App\Models\ModerationQueue;
use App\Models\Occurrence;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ModerationService
{
    /**
     * Threshold for similar reports from same user in short period (abuse pattern).
     * Requirement 14.3: Multiple similar reports from same user in short period.
     */
    public const ABUSE_SIMILAR_REPORTS_THRESHOLD = 3;

    /**
     * Time window for detecting abuse patterns (in minutes).
     */
    public const ABUSE_TIME_WINDOW_MINUTES = 60;

    /**
     * Distance threshold for similar reports (in meters).
     */
    public const SIMILARITY_DISTANCE_METERS = 500;

    /**
     * Threshold for high frequency reports from a user (per hour).
     */
    public const HIGH_FREQUENCY_THRESHOLD = 4;

    /**
     * Analyze an occurrence for anomalies and add to moderation queue if suspicious.
     * Requirement 14.1: Flag suspicious reports for moderation.
     */
    public function analyzeOccurrence(Occurrence $occurrence): ?ModerationQueue
    {
        // Only analyze collaborative reports
        if ($occurrence->source !== OccurrenceSource::COLLABORATIVE) {
            return null;
        }

        $anomalies = $this->detectAnomalies($occurrence);

        if (empty($anomalies)) {
            return null;
        }

        // Determine the primary reason (highest priority)
        $primaryReason = $this->getPrimaryReason($anomalies);

        return ModerationQueue::addToQueue(
            occurrence: $occurrence,
            reason: $primaryReason,
            reportedBy: null,
            detectionDetails: [
                'anomalies' => $anomalies,
                'analyzed_at' => now()->toIso8601String(),
            ]
        );
    }

    /**
     * Detect anomalies in an occurrence.
     *
     * @return array<string, array> Array of detected anomalies with details
     */
    public function detectAnomalies(Occurrence $occurrence): array
    {
        $anomalies = [];

        // Check for abuse pattern (Requirement 14.3)
        $abusePattern = $this->detectAbusePattern($occurrence);
        if ($abusePattern !== null) {
            $anomalies['abuse_pattern'] = $abusePattern;
        }

        // Check for high frequency reports
        $highFrequency = $this->detectHighFrequency($occurrence);
        if ($highFrequency !== null) {
            $anomalies['high_frequency'] = $highFrequency;
        }

        // Check for suspicious location patterns
        $suspiciousLocation = $this->detectSuspiciousLocation($occurrence);
        if ($suspiciousLocation !== null) {
            $anomalies['suspicious_location'] = $suspiciousLocation;
        }

        return $anomalies;
    }

    /**
     * Detect abuse pattern: multiple similar reports from same user in short period.
     * Requirement 14.3: Detect automatically patterns of abuse.
     */
    public function detectAbusePattern(Occurrence $occurrence): ?array
    {
        if ($occurrence->created_by === null) {
            return null;
        }

        $userId = $occurrence->created_by;
        $crimeTypeId = $occurrence->crime_type_id;
        $timestamp = $occurrence->timestamp ?? $occurrence->created_at;
        $location = $occurrence->location;

        // Find similar reports from the same user within the time window
        $timeStart = $timestamp->copy()->subMinutes(self::ABUSE_TIME_WINDOW_MINUTES);
        $timeEnd = $timestamp->copy()->addMinutes(self::ABUSE_TIME_WINDOW_MINUTES);

        $similarReports = Occurrence::query()
            ->where('id', '!=', $occurrence->id)
            ->where('created_by', $userId)
            ->where('crime_type_id', $crimeTypeId)
            ->whereBetween('timestamp', [$timeStart, $timeEnd])
            ->when($location, function ($query) use ($location) {
                return $query->nearPoint($location, self::SIMILARITY_DISTANCE_METERS);
            })
            ->count();

        if ($similarReports >= self::ABUSE_SIMILAR_REPORTS_THRESHOLD) {
            return [
                'user_id' => $userId,
                'similar_reports_count' => $similarReports,
                'crime_type_id' => $crimeTypeId,
                'time_window_minutes' => self::ABUSE_TIME_WINDOW_MINUTES,
                'threshold' => self::ABUSE_SIMILAR_REPORTS_THRESHOLD,
            ];
        }

        return null;
    }

    /**
     * Detect high frequency of reports from a user.
     */
    public function detectHighFrequency(Occurrence $occurrence): ?array
    {
        if ($occurrence->created_by === null) {
            return null;
        }

        $userId = $occurrence->created_by;
        $timestamp = $occurrence->timestamp ?? $occurrence->created_at;

        // Count reports from this user in the last hour
        $recentReports = Occurrence::query()
            ->where('created_by', $userId)
            ->where('timestamp', '>=', $timestamp->copy()->subHour())
            ->count();

        if ($recentReports >= self::HIGH_FREQUENCY_THRESHOLD) {
            return [
                'user_id' => $userId,
                'reports_in_last_hour' => $recentReports,
                'threshold' => self::HIGH_FREQUENCY_THRESHOLD,
            ];
        }

        return null;
    }

    /**
     * Detect suspicious location patterns.
     */
    public function detectSuspiciousLocation(Occurrence $occurrence): ?array
    {
        if ($occurrence->created_by === null || $occurrence->location === null) {
            return null;
        }

        $userId = $occurrence->created_by;
        $location = $occurrence->location;
        $timestamp = $occurrence->timestamp ?? $occurrence->created_at;

        // Check if user has reported from very different locations in short time
        // (physically impossible to travel)
        $recentReports = Occurrence::query()
            ->where('created_by', $userId)
            ->where('id', '!=', $occurrence->id)
            ->where('timestamp', '>=', $timestamp->copy()->subMinutes(30))
            ->whereNotNull('location')
            ->get();

        foreach ($recentReports as $report) {
            // Calculate distance between reports
            $distance = $this->calculateDistance($location, $report->location);
            
            // If distance is more than 50km in 30 minutes (100km/h average), flag as suspicious
            // This is a simplified check - in reality, you'd consider actual travel time
            if ($distance > 50000) { // 50km in meters
                return [
                    'user_id' => $userId,
                    'distance_meters' => $distance,
                    'time_difference_minutes' => $timestamp->diffInMinutes($report->timestamp),
                    'other_occurrence_id' => $report->id,
                ];
            }
        }

        return null;
    }

    /**
     * Calculate distance between two points in meters.
     */
    private function calculateDistance($point1, $point2): float
    {
        $lat1 = deg2rad($point1->latitude);
        $lon1 = deg2rad($point1->longitude);
        $lat2 = deg2rad($point2->latitude);
        $lon2 = deg2rad($point2->longitude);

        $earthRadius = 6371000; // meters

        $dLat = $lat2 - $lat1;
        $dLon = $lon2 - $lon1;

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos($lat1) * cos($lat2) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Get the primary reason from detected anomalies (highest priority).
     */
    private function getPrimaryReason(array $anomalies): ModerationReason
    {
        $reasonMap = [
            'abuse_pattern' => ModerationReason::ABUSE_PATTERN,
            'high_frequency' => ModerationReason::HIGH_FREQUENCY,
            'suspicious_location' => ModerationReason::SUSPICIOUS_LOCATION,
        ];

        $highestPriority = 0;
        $primaryReason = ModerationReason::ANOMALY_DETECTED;

        foreach ($anomalies as $key => $details) {
            if (isset($reasonMap[$key])) {
                $reason = $reasonMap[$key];
                if ($reason->getPriority() > $highestPriority) {
                    $highestPriority = $reason->getPriority();
                    $primaryReason = $reason;
                }
            }
        }

        return $primaryReason;
    }

    /**
     * Check if a user has an abuse pattern.
     * Requirement 14.3: Detect abuse patterns.
     */
    public function hasAbusePattern(int $userId): bool
    {
        $cacheKey = "user_abuse_pattern:{$userId}";
        
        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($userId) {
            // Check for multiple similar reports in short period
            $recentReports = Occurrence::query()
                ->where('created_by', $userId)
                ->where('timestamp', '>=', now()->subMinutes(self::ABUSE_TIME_WINDOW_MINUTES))
                ->get();

            if ($recentReports->count() < self::ABUSE_SIMILAR_REPORTS_THRESHOLD) {
                return false;
            }

            // Group by crime type and check for patterns
            $groupedByCrimeType = $recentReports->groupBy('crime_type_id');

            foreach ($groupedByCrimeType as $crimeTypeId => $reports) {
                if ($reports->count() >= self::ABUSE_SIMILAR_REPORTS_THRESHOLD) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Get pending moderation items.
     */
    public function getPendingItems(int $limit = 50): Collection
    {
        return ModerationQueue::pending()
            ->orderByPriority()
            ->with(['occurrence', 'reporter'])
            ->limit($limit)
            ->get();
    }

    /**
     * Get moderation items by status.
     */
    public function getItemsByStatus(ModerationStatus $status, int $limit = 50): Collection
    {
        return ModerationQueue::where('status', $status)
            ->orderBy('moderated_at', 'desc')
            ->with(['occurrence', 'reporter', 'moderator'])
            ->limit($limit)
            ->get();
    }

    /**
     * Approve a moderation item.
     */
    public function approve(ModerationQueue $item, User $moderator, ?string $notes = null): void
    {
        $item->approve($moderator, $notes);
    }

    /**
     * Reject a moderation item.
     */
    public function reject(ModerationQueue $item, User $moderator, ?string $notes = null): void
    {
        $item->reject($moderator, $notes);
    }

    /**
     * Report an occurrence for moderation.
     */
    public function reportOccurrence(
        Occurrence $occurrence,
        int $reportedBy,
        ?string $reason = null
    ): ModerationQueue {
        return ModerationQueue::addToQueue(
            occurrence: $occurrence,
            reason: ModerationReason::USER_REPORTED,
            reportedBy: $reportedBy,
            detectionDetails: [
                'user_reason' => $reason,
                'reported_at' => now()->toIso8601String(),
            ]
        );
    }

    /**
     * Get moderation statistics.
     */
    public function getStatistics(): array
    {
        return [
            'pending_count' => ModerationQueue::pending()->count(),
            'approved_today' => ModerationQueue::approved()
                ->whereDate('moderated_at', today())
                ->count(),
            'rejected_today' => ModerationQueue::rejected()
                ->whereDate('moderated_at', today())
                ->count(),
            'by_reason' => ModerationQueue::pending()
                ->select('reason', DB::raw('count(*) as count'))
                ->groupBy('reason')
                ->pluck('count', 'reason')
                ->toArray(),
        ];
    }

    /**
     * Clear abuse pattern cache for a user.
     */
    public function clearAbusePatternCache(int $userId): void
    {
        Cache::forget("user_abuse_pattern:{$userId}");
    }
}
