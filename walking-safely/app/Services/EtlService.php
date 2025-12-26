<?php

namespace App\Services;

use App\Enums\OccurrenceSeverity;
use App\Enums\OccurrenceSource;
use App\Enums\OccurrenceStatus;
use App\Models\AuditLog;
use App\Models\CrimeType;
use App\Models\ExternalMapping;
use App\Models\Occurrence;
use App\Models\Region;
use App\ValueObjects\Coordinates;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use MatanYadaev\EloquentSpatial\Objects\Point;

/**
 * ETL Service for processing external data imports.
 * 
 * Implements Requirements:
 * - 12.1: Pipeline ETL for automated data ingestion from external sources
 * - 12.2: Map crime types to standardized taxonomy
 * - 12.3: Deduplication to avoid duplicate records
 * - 12.4: Maintain origin, ingestion timestamp, and confidence score
 */
class EtlService
{
    /**
     * Audit log action for ETL imports.
     */
    public const ACTION_ETL_IMPORT = 'etl_import';
    public const ACTION_ETL_IMPORT_FAILED = 'etl_import_failed';

    /**
     * Maximum distance (in meters) for deduplication.
     */
    public const DEDUPLICATION_DISTANCE = 100;

    /**
     * Maximum time difference (in hours) for deduplication.
     */
    public const DEDUPLICATION_TIME_HOURS = 1;

    /**
     * Default crime type ID when mapping fails.
     */
    protected ?int $defaultCrimeTypeId = null;

    /**
     * Import statistics.
     */
    protected array $stats = [
        'total' => 0,
        'imported' => 0,
        'duplicates' => 0,
        'mapping_failed' => 0,
        'errors' => 0,
    ];

    /**
     * Process a batch of external occurrence data.
     *
     * @param array $records Array of external occurrence records
     * @param string $source Source identifier (e.g., 'ssp_sp', 'delegacia_rj')
     * @param int|null $userId User ID performing the import (for audit)
     * @return array Import statistics
     */
    public function processImport(array $records, string $source, ?int $userId = null): array
    {
        $this->resetStats();
        $this->stats['total'] = count($records);

        $startTime = microtime(true);

        DB::beginTransaction();

        try {
            foreach ($records as $record) {
                $this->processRecord($record, $source);
            }

            DB::commit();

            $duration = round(microtime(true) - $startTime, 2);

            // Log successful import
            $this->logImport($source, $userId, $duration);

            Log::info("ETL Import completed", [
                'source' => $source,
                'stats' => $this->stats,
                'duration_seconds' => $duration,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            // Log failed import
            $this->logImportFailure($source, $userId, $e->getMessage());

            Log::error("ETL Import failed", [
                'source' => $source,
                'error' => $e->getMessage(),
                'stats' => $this->stats,
            ]);

            throw $e;
        }

        return $this->stats;
    }

    /**
     * Process a single external record.
     */
    protected function processRecord(array $record, string $source): void
    {
        try {
            // Validate required fields
            if (!$this->validateRecord($record)) {
                $this->stats['errors']++;
                return;
            }

            // Map external crime type to internal taxonomy (Requirement 12.2)
            $crimeTypeId = $this->mapCrimeType($source, $record);
            
            if ($crimeTypeId === null) {
                $this->stats['mapping_failed']++;
                Log::warning("ETL: Crime type mapping failed", [
                    'source' => $source,
                    'external_code' => $record['crime_code'] ?? $record['crime_type'] ?? 'unknown',
                ]);
                return;
            }

            // Extract coordinates
            $coordinates = $this->extractCoordinates($record);
            if ($coordinates === null) {
                $this->stats['errors']++;
                return;
            }

            // Check for duplicates (Requirement 12.3)
            $timestamp = $this->extractTimestamp($record);
            if ($this->isDuplicate($coordinates, $timestamp, $crimeTypeId, $source, $record)) {
                $this->stats['duplicates']++;
                return;
            }

            // Create the occurrence (Requirement 12.4)
            $this->createOccurrence($record, $source, $crimeTypeId, $coordinates, $timestamp);
            $this->stats['imported']++;

        } catch (\Exception $e) {
            $this->stats['errors']++;
            Log::error("ETL: Error processing record", [
                'source' => $source,
                'error' => $e->getMessage(),
                'record' => $record,
            ]);
        }
    }

    /**
     * Validate that a record has required fields.
     */
    protected function validateRecord(array $record): bool
    {
        // Must have location data
        $hasLocation = (isset($record['latitude']) && isset($record['longitude'])) ||
                       (isset($record['location']['latitude']) && isset($record['location']['longitude']));

        if (!$hasLocation) {
            return false;
        }

        // Must have timestamp
        if (!isset($record['timestamp']) && !isset($record['date']) && !isset($record['occurred_at'])) {
            return false;
        }

        // Must have crime type identifier
        if (!isset($record['crime_code']) && !isset($record['crime_type']) && !isset($record['crime_type_id'])) {
            return false;
        }

        return true;
    }

    /**
     * Map external crime type to internal taxonomy.
     * Requirement 12.2: Map crime types to standardized taxonomy.
     *
     * @param string $source External source identifier
     * @param array $record External record data
     * @return int|null Internal crime type ID or null if mapping fails
     */
    public function mapCrimeType(string $source, array $record): ?int
    {
        // Try to find mapping by external code
        $externalCode = $record['crime_code'] ?? $record['crime_type'] ?? null;
        
        if ($externalCode !== null) {
            $crimeType = ExternalMapping::findCrimeType($source, (string) $externalCode);
            if ($crimeType !== null) {
                return $crimeType->id;
            }
        }

        // Try direct crime_type_id if provided
        if (isset($record['crime_type_id'])) {
            $crimeType = CrimeType::find($record['crime_type_id']);
            if ($crimeType !== null) {
                return $crimeType->id;
            }
        }

        // Return default crime type if configured
        return $this->getDefaultCrimeTypeId();
    }

    /**
     * Extract coordinates from record.
     */
    protected function extractCoordinates(array $record): ?Coordinates
    {
        try {
            if (isset($record['latitude']) && isset($record['longitude'])) {
                return new Coordinates(
                    (float) $record['latitude'],
                    (float) $record['longitude']
                );
            }

            if (isset($record['location']['latitude']) && isset($record['location']['longitude'])) {
                return new Coordinates(
                    (float) $record['location']['latitude'],
                    (float) $record['location']['longitude']
                );
            }

            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Extract timestamp from record.
     */
    protected function extractTimestamp(array $record): \DateTimeInterface
    {
        $timestamp = $record['timestamp'] ?? $record['date'] ?? $record['occurred_at'] ?? now();
        
        if ($timestamp instanceof \DateTimeInterface) {
            return $timestamp;
        }

        return \Carbon\Carbon::parse($timestamp);
    }

    /**
     * Check if an occurrence is a duplicate.
     * Requirement 12.3: Deduplication to avoid duplicate records.
     *
     * Duplicates are identified by:
     * - Same crime type
     * - Location within 100 meters
     * - Timestamp within 1 hour
     * - Same source and source_id (if provided)
     */
    public function isDuplicate(
        Coordinates $coordinates,
        \DateTimeInterface $timestamp,
        int $crimeTypeId,
        string $source,
        array $record
    ): bool {
        // First check by source_id if available (exact match)
        $sourceId = $record['source_id'] ?? $record['id'] ?? $record['external_id'] ?? null;
        
        if ($sourceId !== null) {
            $existsBySourceId = Occurrence::query()
                ->where('source', OccurrenceSource::OFFICIAL)
                ->where('source_id', $sourceId)
                ->exists();

            if ($existsBySourceId) {
                return true;
            }
        }

        // Check by location, time, and crime type
        $point = $coordinates->toPoint();
        $timeStart = \Carbon\Carbon::parse($timestamp)->subHours(self::DEDUPLICATION_TIME_HOURS);
        $timeEnd = \Carbon\Carbon::parse($timestamp)->addHours(self::DEDUPLICATION_TIME_HOURS);

        return Occurrence::query()
            ->where('crime_type_id', $crimeTypeId)
            ->whereBetween('timestamp', [$timeStart, $timeEnd])
            ->nearPoint($point, self::DEDUPLICATION_DISTANCE)
            ->exists();
    }

    /**
     * Create an occurrence from external data.
     * Requirement 12.4: Maintain origin, ingestion timestamp, and confidence score.
     */
    protected function createOccurrence(
        array $record,
        string $source,
        int $crimeTypeId,
        Coordinates $coordinates,
        \DateTimeInterface $timestamp
    ): Occurrence {
        // Extract severity or use default
        $severity = $this->extractSeverity($record);

        // Find region for coordinates
        $regionId = $this->findRegionForCoordinates($coordinates);

        // Extract source_id for tracking
        $sourceId = $record['source_id'] ?? $record['id'] ?? $record['external_id'] ?? null;

        // Build metadata with import information
        $metadata = [
            'import_source' => $source,
            'import_timestamp' => now()->toIso8601String(),
            'original_data' => $this->sanitizeOriginalData($record),
        ];

        return Occurrence::create([
            'timestamp' => $timestamp,
            'location' => $coordinates->toPoint(),
            'crime_type_id' => $crimeTypeId,
            'severity' => $severity,
            'confidence_score' => OccurrenceSource::OFFICIAL->getInitialConfidenceScore(), // 5 for official
            'source' => OccurrenceSource::OFFICIAL,
            'source_id' => $sourceId,
            'region_id' => $regionId,
            'status' => OccurrenceStatus::ACTIVE,
            'expires_at' => null, // Official sources don't expire
            'created_by' => null,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Extract severity from record or return default.
     */
    protected function extractSeverity(array $record): OccurrenceSeverity
    {
        if (isset($record['severity'])) {
            $severity = $record['severity'];
            
            if ($severity instanceof OccurrenceSeverity) {
                return $severity;
            }

            try {
                return OccurrenceSeverity::from($severity);
            } catch (\ValueError $e) {
                // Fall through to default
            }
        }

        // Default to medium severity
        return OccurrenceSeverity::MEDIUM;
    }

    /**
     * Find the region containing the given coordinates.
     */
    protected function findRegionForCoordinates(Coordinates $coordinates): ?int
    {
        $point = $coordinates->toPoint();

        $region = Region::query()
            ->whereContains('boundary', $point)
            ->orderBy('type', 'desc')
            ->first();

        return $region?->id;
    }

    /**
     * Sanitize original data for storage (remove sensitive fields).
     */
    protected function sanitizeOriginalData(array $record): array
    {
        // Remove potentially sensitive fields
        $sensitiveFields = ['password', 'token', 'api_key', 'secret'];
        
        return array_filter($record, function ($key) use ($sensitiveFields) {
            return !in_array(strtolower($key), $sensitiveFields);
        }, ARRAY_FILTER_USE_KEY);
    }

    /**
     * Get or find the default crime type ID.
     */
    protected function getDefaultCrimeTypeId(): ?int
    {
        if ($this->defaultCrimeTypeId !== null) {
            return $this->defaultCrimeTypeId;
        }

        // Try to find "Outros" (Others) crime type
        $defaultType = CrimeType::where('name', 'Outros')
            ->orWhere('name', 'Other')
            ->first();

        $this->defaultCrimeTypeId = $defaultType?->id;

        return $this->defaultCrimeTypeId;
    }

    /**
     * Set the default crime type ID.
     */
    public function setDefaultCrimeTypeId(?int $crimeTypeId): self
    {
        $this->defaultCrimeTypeId = $crimeTypeId;
        return $this;
    }

    /**
     * Reset import statistics.
     */
    protected function resetStats(): void
    {
        $this->stats = [
            'total' => 0,
            'imported' => 0,
            'duplicates' => 0,
            'mapping_failed' => 0,
            'errors' => 0,
        ];
    }

    /**
     * Log successful import to audit log.
     */
    protected function logImport(string $source, ?int $userId, float $duration): void
    {
        AuditLog::log(
            action: self::ACTION_ETL_IMPORT,
            userId: $userId,
            details: [
                'source' => $source,
                'stats' => $this->stats,
                'duration_seconds' => $duration,
            ]
        );
    }

    /**
     * Log failed import to audit log.
     */
    protected function logImportFailure(string $source, ?int $userId, string $error): void
    {
        AuditLog::log(
            action: self::ACTION_ETL_IMPORT_FAILED,
            userId: $userId,
            details: [
                'source' => $source,
                'error' => $error,
                'stats' => $this->stats,
            ]
        );
    }

    /**
     * Get current import statistics.
     */
    public function getStats(): array
    {
        return $this->stats;
    }

    /**
     * Create or update an external mapping.
     */
    public function createExternalMapping(
        string $source,
        string $externalCode,
        string $externalName,
        int $crimeTypeId
    ): ExternalMapping {
        return ExternalMapping::updateOrCreate(
            [
                'source' => $source,
                'external_code' => $externalCode,
            ],
            [
                'crime_type_id' => $crimeTypeId,
                'external_name' => $externalName,
            ]
        );
    }

    /**
     * Get all external mappings for a source.
     */
    public function getExternalMappings(string $source): Collection
    {
        return ExternalMapping::where('source', $source)
            ->with('crimeType')
            ->get();
    }

    /**
     * Find potential duplicates for a set of records.
     * Useful for preview before import.
     */
    public function findPotentialDuplicates(array $records, string $source): array
    {
        $duplicates = [];

        foreach ($records as $index => $record) {
            if (!$this->validateRecord($record)) {
                continue;
            }

            $coordinates = $this->extractCoordinates($record);
            if ($coordinates === null) {
                continue;
            }

            $timestamp = $this->extractTimestamp($record);
            $crimeTypeId = $this->mapCrimeType($source, $record);

            if ($crimeTypeId !== null && $this->isDuplicate($coordinates, $timestamp, $crimeTypeId, $source, $record)) {
                $duplicates[] = [
                    'index' => $index,
                    'record' => $record,
                ];
            }
        }

        return $duplicates;
    }
}
