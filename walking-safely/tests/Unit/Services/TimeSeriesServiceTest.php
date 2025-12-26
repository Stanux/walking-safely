<?php

namespace Tests\Unit\Services;

use App\Services\TimeSeriesService;
use Tests\TestCase;

class TimeSeriesServiceTest extends TestCase
{
    private TimeSeriesService $timeSeriesService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->timeSeriesService = new TimeSeriesService();
    }

    /**
     * Test validateGranularity returns valid granularity.
     * @see Requirement 11.3
     */
    public function test_validate_granularity_returns_valid_values(): void
    {
        $this->assertEquals('hour', $this->timeSeriesService->validateGranularity('hour'));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity('day'));
        $this->assertEquals('week', $this->timeSeriesService->validateGranularity('week'));
        $this->assertEquals('month', $this->timeSeriesService->validateGranularity('month'));
    }

    /**
     * Test validateGranularity handles case insensitivity.
     */
    public function test_validate_granularity_is_case_insensitive(): void
    {
        $this->assertEquals('hour', $this->timeSeriesService->validateGranularity('HOUR'));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity('Day'));
        $this->assertEquals('week', $this->timeSeriesService->validateGranularity('WEEK'));
        $this->assertEquals('month', $this->timeSeriesService->validateGranularity('Month'));
    }

    /**
     * Test validateGranularity returns default for invalid values.
     */
    public function test_validate_granularity_returns_default_for_invalid(): void
    {
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity('invalid'));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity(''));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity('yearly'));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity('minute'));
    }

    /**
     * Test validateGranularity trims whitespace.
     */
    public function test_validate_granularity_trims_whitespace(): void
    {
        $this->assertEquals('hour', $this->timeSeriesService->validateGranularity('  hour  '));
        $this->assertEquals('day', $this->timeSeriesService->validateGranularity("\tday\n"));
    }

    /**
     * Test VALID_GRANULARITIES constant contains expected values.
     */
    public function test_valid_granularities_constant(): void
    {
        $expected = ['hour', 'day', 'week', 'month'];
        $this->assertEquals($expected, TimeSeriesService::VALID_GRANULARITIES);
    }

    /**
     * Test cache TTL constant is set.
     */
    public function test_cache_ttl_constant(): void
    {
        $this->assertEquals(300, TimeSeriesService::CACHE_TTL);
    }
}
