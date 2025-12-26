<?php

namespace Tests\Unit\Services;

use App\Jobs\AnonymizeLocationData;
use App\Models\User;
use App\Services\DataAnonymizationService;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

/**
 * Tests for DataAnonymizationService.
 *
 * @see Requirement 15.2 - Avoid storing location history associated with user identification
 * @see Requirement 15.4 - Aggregate and anonymize location data before using for statistical analysis
 */
class DataAnonymizationServiceTest extends TestCase
{
    private DataAnonymizationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DataAnonymizationService();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_dispatch_anonymization_queues_job(): void
    {
        Queue::fake();

        $this->service->dispatchAnonymization();

        Queue::assertPushed(AnonymizeLocationData::class);
    }

    public function test_dispatch_anonymization_with_region_id_queues_job(): void
    {
        Queue::fake();

        $this->service->dispatchAnonymization('region-123');

        Queue::assertPushed(AnonymizeLocationData::class, function ($job) {
            return $job->regionId === 'region-123';
        });
    }

    public function test_can_safely_aggregate_returns_true_for_sufficient_count(): void
    {
        $result = $this->service->canSafelyAggregate(AnonymizeLocationData::MIN_AGGREGATION_COUNT);

        $this->assertTrue($result);
    }

    public function test_can_safely_aggregate_returns_true_for_count_above_threshold(): void
    {
        $result = $this->service->canSafelyAggregate(AnonymizeLocationData::MIN_AGGREGATION_COUNT + 10);

        $this->assertTrue($result);
    }

    public function test_can_safely_aggregate_returns_false_for_insufficient_count(): void
    {
        $result = $this->service->canSafelyAggregate(AnonymizeLocationData::MIN_AGGREGATION_COUNT - 1);

        $this->assertFalse($result);
    }

    public function test_can_safely_aggregate_returns_false_for_zero_count(): void
    {
        $result = $this->service->canSafelyAggregate(0);

        $this->assertFalse($result);
    }

    public function test_anonymization_threshold_is_at_least_five(): void
    {
        // Ensure minimum aggregation count is at least 5 for k-anonymity
        $this->assertGreaterThanOrEqual(5, AnonymizeLocationData::MIN_AGGREGATION_COUNT);
    }

    public function test_anonymization_threshold_days_is_reasonable(): void
    {
        // Ensure data is anonymized within a reasonable timeframe
        $this->assertGreaterThanOrEqual(1, AnonymizeLocationData::ANONYMIZATION_THRESHOLD_DAYS);
        $this->assertLessThanOrEqual(30, AnonymizeLocationData::ANONYMIZATION_THRESHOLD_DAYS);
    }
}
