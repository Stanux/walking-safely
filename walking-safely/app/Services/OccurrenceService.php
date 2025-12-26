<?php

namespace App\Services;

use App\Enums\OccurrenceSeverity;
use App\Enums\OccurrenceSource;
use App\Enums\OccurrenceStatus;
use App\Jobs\RecalculateRiskIndex;
use App\Models\ModerationQueue;
use App\Models\Occurrence;
use App\Models\OccurrenceValidation;
use App\Models\Region;
use App\ValueObjects\Coordinates;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use MatanYadaev\EloquentSpatial\Objects\Point;

class OccurrenceService
{
    /**
     * The moderation service instance.
     */
    protected ?ModerationService $moderationService = null;

    /**
     * Set the moderation service for anomaly detection.
     */
    public function setModerationService(ModerationService $moderationService): void
    {
        $this->moderationService = $moderationService;
    }

    /**
     * Get the moderation service instance.
     */
    protected function getModerationService(): ModerationService
    {
        if ($this->moderationService === null) {
            $this->moderationService = app(ModerationService::class);
        }

        return $this->moderationService;
    }

    /**
     * Maximum distance (in meters) between user location and occurrence location.
     */
    public const MAX_LOCATION_DISTANCE = 100;

    /**
     * Maximum distance (in meters) for finding similar occurrences.
     */
    public const SIMILARITY_DISTANCE = 500;

    /**
     * Maximum time difference (in minutes) for finding similar occurrences.
     */
    public const SIMILARITY_TIME_MINUTES = 30;

    /**
     * Maximum number of reports per user per hour.
     */
    public const MAX_REPORTS_PER_HOUR = 5;

    /**
     * Maximum confidence score for collaborative reports.
     */
    public const MAX_COLLABORATIVE_CONFIDENCE = 4;

    /**
     * Days until collaborative reports expire.
     */
    public const EXPIRATION_DAYS = 7;

    /**
     * Create a new occurrence with location validation.
     *
     * @param array $data Occurrence data
     * @param Coordinates $userLocation Current user location for validation
     * @return Occurrence
     * @throws \InvalidArgumentException If location validation fails
     * @throws \RuntimeException If rate limit exceeded
     */
    public function createOccurrence(array $data, Coordinates $userLocation): Occurrence
    {
        // Validate required fields
        $this->validateRequiredFields($data);

        // Get occurrence coordinates
        $occurrenceCoordinates = $this->extractCoordinates($data);

        // Validate location proximity (Requirement 7.2)
        if (!$this->validateOccurrenceLocation($occurrenceCoordinates, $userLocation)) {
            throw new \InvalidArgumentException(
                'Occurrence location must be within ' . self::MAX_LOCATION_DISTANCE . ' meters of user location.'
            );
        }

        // Check rate limiting for collaborative reports (Requirement 7.5)
        $userId = $data['created_by'] ?? null;
        if ($userId && !$this->canUserSubmit($userId)) {
            throw new \RuntimeException(
                'Rate limit exceeded. Maximum ' . self::MAX_REPORTS_PER_HOUR . ' reports per hour.'
            );
        }

        // Determine source and initial confidence score
        $source = OccurrenceSource::from($data['source'] ?? 'collaborative');
        $confidenceScore = $source->getInitialConfidenceScore();

        // Set expiration for collaborative reports (Requirement 7.4)
        $expiresAt = null;
        if ($source === OccurrenceSource::COLLABORATIVE) {
            $expiresAt = now()->addDays(self::EXPIRATION_DAYS);
        }

        // Find region for the occurrence
        $regionId = $this->findRegionForCoordinates($occurrenceCoordinates);

        // Create the occurrence
        $occurrence = Occurrence::create([
            'timestamp' => $data['timestamp'] ?? now(),
            'location' => $occurrenceCoordinates->toPoint(),
            'crime_type_id' => $data['crime_type_id'],
            'severity' => $data['severity'],
            'confidence_score' => $confidenceScore,
            'source' => $source,
            'source_id' => $data['source_id'] ?? null,
            'region_id' => $regionId,
            'status' => OccurrenceStatus::ACTIVE,
            'expires_at' => $expiresAt,
            'created_by' => $userId,
            'metadata' => $data['metadata'] ?? null,
        ]);

        // Check for similar occurrences and increase confidence if found (Requirement 7.3)
        $this->processCorroboration($occurrence);

        // Analyze for anomalies and add to moderation queue if suspicious (Requirement 14.1)
        $this->getModerationService()->analyzeOccurrence($occurrence);

        // Dispatch job to recalculate risk index for the affected region
        // Requirement 5.3: Recalculate within 5 minutes of new occurrence
        if ($regionId !== null) {
            RecalculateRiskIndex::dispatch($regionId);
        }

        return $occurrence;
    }

    /**
     * Validate that required fields are present.
     *
     * @param array $data
     * @throws \InvalidArgumentException
     */
    private function validateRequiredFields(array $data): void
    {
        $required = ['crime_type_id', 'severity'];

        // Location can be provided as coordinates or latitude/longitude
        $hasLocation = isset($data['location']) || 
            (isset($data['latitude']) && isset($data['longitude']));

        if (!$hasLocation) {
            throw new \InvalidArgumentException('Location coordinates are required.');
        }

        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required.");
            }
        }

        // Validate severity is valid
        if (!in_array($data['severity'], OccurrenceSeverity::values())) {
            throw new \InvalidArgumentException('Invalid severity value.');
        }
    }

    /**
     * Extract coordinates from data array.
     */
    private function extractCoordinates(array $data): Coordinates
    {
        if (isset($data['location']) && $data['location'] instanceof Coordinates) {
            return $data['location'];
        }

        if (isset($data['location']) && is_array($data['location'])) {
            return Coordinates::fromArray($data['location']);
        }

        return new Coordinates(
            (float) $data['latitude'],
            (float) $data['longitude']
        );
    }

    /**
     * Validate that occurrence location is within allowed distance of user location.
     * Requirement 7.2: Coordinates must be within 100 meters of user location.
     */
    public function validateOccurrenceLocation(Coordinates $occurrenceLocation, Coordinates $userLocation): bool
    {
        return $occurrenceLocation->isWithinDistance($userLocation, self::MAX_LOCATION_DISTANCE);
    }

    /**
     * Find similar occurrences for deduplication.
     * Requirement 7.3: Similar = same type, within 500m and 30 minutes.
     */
    public function findSimilarOccurrences(Occurrence $occurrence): Collection
    {
        $point = $occurrence->location;
        $timestamp = $occurrence->timestamp;
        $crimeTypeId = $occurrence->crime_type_id;

        $timeStart = $timestamp->copy()->subMinutes(self::SIMILARITY_TIME_MINUTES);
        $timeEnd = $timestamp->copy()->addMinutes(self::SIMILARITY_TIME_MINUTES);

        return Occurrence::query()
            ->where('id', '!=', $occurrence->id)
            ->where('crime_type_id', $crimeTypeId)
            ->active()
            ->whereBetween('timestamp', [$timeStart, $timeEnd])
            ->nearPoint($point, self::SIMILARITY_DISTANCE)
            ->get();
    }

    /**
     * Process corroboration for a new occurrence.
     * Requirement 7.3: Increase confidence score when similar reports exist.
     */
    private function processCorroboration(Occurrence $occurrence): void
    {
        if (!$occurrence->isCollaborative()) {
            return;
        }

        $similarOccurrences = $this->findSimilarOccurrences($occurrence);

        if ($similarOccurrences->isEmpty()) {
            return;
        }

        // Increase confidence of existing similar occurrences
        foreach ($similarOccurrences as $similar) {
            if ($similar->confidence_score < self::MAX_COLLABORATIVE_CONFIDENCE) {
                $similar->increaseConfidenceScore(1, self::MAX_COLLABORATIVE_CONFIDENCE);

                // Record the corroboration
                OccurrenceValidation::create([
                    'occurrence_id' => $similar->id,
                    'validated_by' => $occurrence->created_by,
                    'validation_type' => OccurrenceValidation::TYPE_CORROBORATION,
                    'status' => OccurrenceValidation::STATUS_APPROVED,
                    'metadata' => [
                        'corroborating_occurrence_id' => $occurrence->id,
                    ],
                ]);
            }
        }

        // Also increase confidence of the new occurrence if it corroborates existing ones
        if ($occurrence->confidence_score < self::MAX_COLLABORATIVE_CONFIDENCE) {
            $occurrence->increaseConfidenceScore(1, self::MAX_COLLABORATIVE_CONFIDENCE);
        }
    }

    /**
     * Check if a user can submit a new report (rate limiting).
     * Requirement 7.5: Maximum 5 reports per hour per user.
     */
    public function canUserSubmit(int $userId): bool
    {
        $cacheKey = "user_reports:{$userId}";
        $recentReports = Cache::get($cacheKey, 0);

        return $recentReports < self::MAX_REPORTS_PER_HOUR;
    }

    /**
     * Record a user submission for rate limiting.
     */
    public function recordUserSubmission(int $userId): void
    {
        $cacheKey = "user_reports:{$userId}";
        $recentReports = Cache::get($cacheKey, 0);

        Cache::put($cacheKey, $recentReports + 1, now()->addHour());
    }

    /**
     * Get the count of reports by a user in the last hour.
     */
    public function getUserReportCount(int $userId): int
    {
        $cacheKey = "user_reports:{$userId}";
        return Cache::get($cacheKey, 0);
    }

    /**
     * Find the region containing the given coordinates.
     */
    private function findRegionForCoordinates(Coordinates $coordinates): ?int
    {
        $point = $coordinates->toPoint();

        $region = Region::query()
            ->whereContains('boundary', $point)
            ->orderBy('type', 'desc') // Prefer more specific regions (neighborhood > district > city)
            ->first();

        return $region?->id;
    }

    /**
     * Get an occurrence by ID.
     */
    public function getOccurrence(int $id): ?Occurrence
    {
        return Occurrence::find($id);
    }

    /**
     * Get occurrences in a region with optional filters.
     */
    public function getOccurrencesInRegion(int $regionId, array $filters = []): Collection
    {
        $query = Occurrence::query()
            ->inRegion($regionId)
            ->active();

        if (isset($filters['crime_type_id'])) {
            $query->byCrimeType($filters['crime_type_id']);
        }

        if (isset($filters['severity'])) {
            $query->bySeverity(OccurrenceSeverity::from($filters['severity']));
        }

        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->inDateRange($filters['start_date'], $filters['end_date']);
        }

        if (isset($filters['days'])) {
            $query->withinDays($filters['days']);
        }

        return $query->orderBy('timestamp', 'desc')->get();
    }

    /**
     * Get occurrences near a point.
     */
    public function getOccurrencesNearPoint(
        Coordinates $coordinates, 
        float $radiusMeters, 
        array $filters = []
    ): Collection {
        $point = $coordinates->toPoint();

        $query = Occurrence::query()
            ->nearPoint($point, $radiusMeters)
            ->active();

        if (isset($filters['crime_type_id'])) {
            $query->byCrimeType($filters['crime_type_id']);
        }

        if (isset($filters['days'])) {
            $query->withinDays($filters['days']);
        }

        return $query->orderBy('timestamp', 'desc')->get();
    }

    /**
     * Merge duplicate occurrences into a single occurrence.
     */
    public function mergeOccurrences(array $occurrenceIds, int $targetId): Occurrence
    {
        $target = Occurrence::findOrFail($targetId);

        DB::transaction(function () use ($occurrenceIds, $target) {
            foreach ($occurrenceIds as $id) {
                if ($id === $target->id) {
                    continue;
                }

                $occurrence = Occurrence::find($id);
                if ($occurrence) {
                    $occurrence->markAsMergedInto($target);
                }
            }

            // Increase confidence of target based on merged occurrences
            $mergedCount = count($occurrenceIds) - 1;
            $newConfidence = min(
                $target->confidence_score + $mergedCount,
                $target->isCollaborative() ? self::MAX_COLLABORATIVE_CONFIDENCE : 5
            );
            $target->confidence_score = $newConfidence;
            $target->save();
        });

        return $target->fresh();
    }
}
