<?php

namespace App\Jobs;

use App\Enums\OccurrenceStatus;
use App\Models\Occurrence;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExpireOldOccurrences implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of occurrences to process per batch.
     */
    protected int $batchSize;

    /**
     * Create a new job instance.
     */
    public function __construct(int $batchSize = 100)
    {
        $this->batchSize = $batchSize;
    }

    /**
     * Execute the job.
     * 
     * Requirement 7.4: Expire collaborative reports after 7 days
     * if not validated by additional reports or official sources.
     */
    public function handle(): void
    {
        $expiredCount = 0;

        // Process expired occurrences in batches
        Occurrence::query()
            ->expired()
            ->chunkById($this->batchSize, function ($occurrences) use (&$expiredCount) {
                foreach ($occurrences as $occurrence) {
                    $this->expireOccurrence($occurrence);
                    $expiredCount++;
                }
            });

        Log::info("ExpireOldOccurrences job completed", [
            'expired_count' => $expiredCount,
        ]);
    }

    /**
     * Expire a single occurrence.
     */
    protected function expireOccurrence(Occurrence $occurrence): void
    {
        // Check if the occurrence has been validated by official sources
        // or has high enough confidence score to be preserved
        if ($this->shouldPreserve($occurrence)) {
            // Extend expiration instead of expiring
            $occurrence->expires_at = now()->addDays(7);
            $occurrence->save();
            return;
        }

        $occurrence->markAsExpired();

        Log::debug("Occurrence expired", [
            'occurrence_id' => $occurrence->id,
            'original_timestamp' => $occurrence->timestamp,
            'expires_at' => $occurrence->expires_at,
        ]);
    }

    /**
     * Check if an occurrence should be preserved instead of expired.
     */
    protected function shouldPreserve(Occurrence $occurrence): bool
    {
        // Official sources don't expire
        if ($occurrence->isOfficial()) {
            return true;
        }

        // High confidence collaborative reports are preserved
        if ($occurrence->confidence_score >= 4) {
            return true;
        }

        // Check for official validation
        $hasOfficialValidation = $occurrence->validations()
            ->where('validation_type', 'official_confirmation')
            ->where('status', 'approved')
            ->exists();

        return $hasOfficialValidation;
    }
}
