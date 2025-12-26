<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Services\EtlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Job for processing ETL imports from external data sources.
 * 
 * Implements Requirements:
 * - 12.1: Pipeline ETL for automated data ingestion from external sources
 * - 12.2: Map crime types to standardized taxonomy
 * - 12.3: Deduplication to avoid duplicate records
 * - 12.4: Maintain origin, ingestion timestamp, and confidence score
 * - 12.5: Notify administrators when source unavailable for 24+ hours
 */
class ProcessEtlImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    /**
     * The maximum number of unhandled exceptions to allow before failing.
     */
    public int $maxExceptions = 3;

    /**
     * The external data records to import.
     */
    protected array $records;

    /**
     * The source identifier.
     */
    protected string $source;

    /**
     * The user ID performing the import.
     */
    protected ?int $userId;

    /**
     * Optional default crime type ID for unmapped types.
     */
    protected ?int $defaultCrimeTypeId;

    /**
     * Whether to notify on completion.
     */
    protected bool $notifyOnComplete;

    /**
     * Create a new job instance.
     *
     * @param array $records External data records to import
     * @param string $source Source identifier (e.g., 'ssp_sp', 'delegacia_rj')
     * @param int|null $userId User ID performing the import
     * @param int|null $defaultCrimeTypeId Default crime type for unmapped types
     * @param bool $notifyOnComplete Whether to notify administrators on completion
     */
    public function __construct(
        array $records,
        string $source,
        ?int $userId = null,
        ?int $defaultCrimeTypeId = null,
        bool $notifyOnComplete = false
    ) {
        $this->records = $records;
        $this->source = $source;
        $this->userId = $userId;
        $this->defaultCrimeTypeId = $defaultCrimeTypeId;
        $this->notifyOnComplete = $notifyOnComplete;
    }

    /**
     * Execute the job.
     */
    public function handle(EtlService $etlService): void
    {
        Log::info("ProcessEtlImport: Starting import", [
            'source' => $this->source,
            'record_count' => count($this->records),
            'user_id' => $this->userId,
        ]);

        // Configure default crime type if provided
        if ($this->defaultCrimeTypeId !== null) {
            $etlService->setDefaultCrimeTypeId($this->defaultCrimeTypeId);
        }

        try {
            // Process the import
            $stats = $etlService->processImport(
                $this->records,
                $this->source,
                $this->userId
            );

            Log::info("ProcessEtlImport: Import completed successfully", [
                'source' => $this->source,
                'stats' => $stats,
            ]);

            // Dispatch risk recalculation for affected regions
            $this->dispatchRiskRecalculation();

            // Notify if configured
            if ($this->notifyOnComplete) {
                $this->notifyImportComplete($stats);
            }

        } catch (\Exception $e) {
            Log::error("ProcessEtlImport: Import failed", [
                'source' => $this->source,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessEtlImport: Job failed permanently", [
            'source' => $this->source,
            'record_count' => count($this->records),
            'error' => $exception->getMessage(),
        ]);

        // Log the failure
        AuditLog::log(
            action: EtlService::ACTION_ETL_IMPORT_FAILED,
            userId: $this->userId,
            details: [
                'source' => $this->source,
                'record_count' => count($this->records),
                'error' => $exception->getMessage(),
                'attempts' => $this->attempts(),
            ]
        );

        // Notify administrators of the failure
        $this->notifyImportFailed($exception);
    }

    /**
     * Dispatch risk recalculation for all regions.
     */
    protected function dispatchRiskRecalculation(): void
    {
        // Dispatch a job to recalculate risk indexes
        // This ensures risk data is updated after import
        RecalculateRiskIndex::dispatch(null, 100)
            ->delay(now()->addMinutes(5));
    }

    /**
     * Notify administrators of successful import.
     */
    protected function notifyImportComplete(array $stats): void
    {
        Log::info("ProcessEtlImport: Sending completion notification", [
            'source' => $this->source,
            'stats' => $stats,
        ]);

        // In a real implementation, this would send notifications
        // via email, Slack, or other channels
    }

    /**
     * Notify administrators of failed import.
     */
    protected function notifyImportFailed(\Throwable $exception): void
    {
        Log::warning("ProcessEtlImport: Sending failure notification", [
            'source' => $this->source,
            'error' => $exception->getMessage(),
        ]);

        // In a real implementation, this would send notifications
        // via email, Slack, or other channels
    }

    /**
     * Get the tags that should be assigned to the job.
     */
    public function tags(): array
    {
        return [
            'etl',
            'source:' . $this->source,
            'records:' . count($this->records),
        ];
    }

    /**
     * Create a job for importing from a specific source.
     */
    public static function fromSource(
        array $records,
        string $source,
        ?int $userId = null
    ): self {
        return new self($records, $source, $userId);
    }

    /**
     * Create a job with notification enabled.
     */
    public function withNotification(): self
    {
        $this->notifyOnComplete = true;
        return $this;
    }

    /**
     * Create a job with a default crime type.
     */
    public function withDefaultCrimeType(int $crimeTypeId): self
    {
        $this->defaultCrimeTypeId = $crimeTypeId;
        return $this;
    }
}
