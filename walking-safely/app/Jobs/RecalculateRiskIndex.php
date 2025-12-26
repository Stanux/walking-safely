<?php

namespace App\Jobs;

use App\Models\Region;
use App\Services\RiskService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RecalculateRiskIndex implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The region ID to recalculate (null for all regions).
     */
    protected ?int $regionId;

    /**
     * The number of regions to process per batch.
     */
    protected int $batchSize;

    /**
     * Create a new job instance.
     *
     * @param int|null $regionId Specific region to recalculate, or null for all regions
     * @param int $batchSize Number of regions to process per batch
     */
    public function __construct(?int $regionId = null, int $batchSize = 50)
    {
        $this->regionId = $regionId;
        $this->batchSize = $batchSize;
    }

    /**
     * Execute the job.
     *
     * Requirement 5.1: Maintain risk index for each region, updated at least every 24 hours.
     * Requirement 5.3: Recalculate within 5 minutes of new occurrence.
     */
    public function handle(RiskService $riskService): void
    {
        if ($this->regionId !== null) {
            $this->recalculateSingleRegion($riskService);
        } else {
            $this->recalculateAllRegions($riskService);
        }
    }

    /**
     * Recalculate risk index for a single region.
     */
    protected function recalculateSingleRegion(RiskService $riskService): void
    {
        $region = Region::find($this->regionId);

        if (!$region) {
            Log::warning("RecalculateRiskIndex: Region not found", [
                'region_id' => $this->regionId,
            ]);
            return;
        }

        $riskIndex = $riskService->recalculateRegionRisk($this->regionId);

        Log::info("RecalculateRiskIndex: Single region completed", [
            'region_id' => $this->regionId,
            'region_name' => $region->name,
            'risk_value' => $riskIndex->value,
            'occurrence_count' => $riskIndex->occurrence_count,
        ]);
    }

    /**
     * Recalculate risk indexes for all regions in batches.
     */
    protected function recalculateAllRegions(RiskService $riskService): void
    {
        $processedCount = 0;
        $startTime = microtime(true);

        Region::query()
            ->chunkById($this->batchSize, function ($regions) use ($riskService, &$processedCount) {
                foreach ($regions as $region) {
                    try {
                        $riskService->recalculateRegionRisk($region->id);
                        $processedCount++;
                    } catch (\Exception $e) {
                        Log::error("RecalculateRiskIndex: Failed to recalculate region", [
                            'region_id' => $region->id,
                            'region_name' => $region->name,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $duration = round(microtime(true) - $startTime, 2);

        Log::info("RecalculateRiskIndex: Batch completed", [
            'processed_count' => $processedCount,
            'duration_seconds' => $duration,
        ]);
    }

    /**
     * Create a job for a specific region.
     */
    public static function forRegion(int $regionId): self
    {
        return new self($regionId);
    }

    /**
     * Create a job for all regions.
     */
    public static function forAllRegions(int $batchSize = 50): self
    {
        return new self(null, $batchSize);
    }
}
