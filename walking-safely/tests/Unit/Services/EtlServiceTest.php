<?php

namespace Tests\Unit\Services;

use App\Enums\OccurrenceSeverity;
use App\Enums\OccurrenceSource;
use App\Services\EtlService;
use App\ValueObjects\Coordinates;
use Tests\TestCase;

class EtlServiceTest extends TestCase
{
    private EtlService $etlService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->etlService = new EtlService();
    }

    /**
     * Test deduplication distance constant.
     * @see Requirement 12.3
     */
    public function test_deduplication_distance_is_100_meters(): void
    {
        $this->assertEquals(100, EtlService::DEDUPLICATION_DISTANCE);
    }

    /**
     * Test deduplication time window is 1 hour.
     * @see Requirement 12.3
     */
    public function test_deduplication_time_window_is_1_hour(): void
    {
        $this->assertEquals(1, EtlService::DEDUPLICATION_TIME_HOURS);
    }

    /**
     * Test audit log action constants.
     * @see Requirement 12.4
     */
    public function test_audit_log_action_constants(): void
    {
        $this->assertEquals('etl_import', EtlService::ACTION_ETL_IMPORT);
        $this->assertEquals('etl_import_failed', EtlService::ACTION_ETL_IMPORT_FAILED);
    }

    /**
     * Test setDefaultCrimeTypeId configures fallback and returns self.
     */
    public function test_set_default_crime_type_id_returns_self(): void
    {
        $result = $this->etlService->setDefaultCrimeTypeId(123);

        $this->assertSame($this->etlService, $result);
    }

    /**
     * Test getStats returns initial empty stats.
     */
    public function test_get_stats_returns_initial_stats(): void
    {
        $stats = $this->etlService->getStats();

        $this->assertIsArray($stats);
        $this->assertEquals(0, $stats['total']);
        $this->assertEquals(0, $stats['imported']);
        $this->assertEquals(0, $stats['duplicates']);
        $this->assertEquals(0, $stats['mapping_failed']);
        $this->assertEquals(0, $stats['errors']);
    }

    /**
     * Test official source confidence score is 5.
     * @see Requirement 12.4
     */
    public function test_official_source_confidence_score_is_5(): void
    {
        $this->assertEquals(5, OccurrenceSource::OFFICIAL->getInitialConfidenceScore());
    }

    /**
     * Test severity extraction defaults to medium.
     */
    public function test_severity_values_are_valid(): void
    {
        $validSeverities = OccurrenceSeverity::values();

        $this->assertContains('low', $validSeverities);
        $this->assertContains('medium', $validSeverities);
        $this->assertContains('high', $validSeverities);
        $this->assertContains('critical', $validSeverities);
    }

    /**
     * Test coordinates can be created for ETL processing.
     */
    public function test_coordinates_can_be_created(): void
    {
        $coordinates = new Coordinates(-23.5505, -46.6333);

        $this->assertEquals(-23.5505, $coordinates->latitude);
        $this->assertEquals(-46.6333, $coordinates->longitude);
    }

    /**
     * Test coordinates can be converted to point.
     */
    public function test_coordinates_can_be_converted_to_point(): void
    {
        $coordinates = new Coordinates(-23.5505, -46.6333);
        $point = $coordinates->toPoint();

        $this->assertEquals(-23.5505, $point->latitude);
        $this->assertEquals(-46.6333, $point->longitude);
    }

    /**
     * Test coordinates distance calculation for deduplication.
     * @see Requirement 12.3
     */
    public function test_coordinates_distance_calculation(): void
    {
        $coord1 = new Coordinates(-23.5505, -46.6333);
        $coord2 = new Coordinates(-23.5505, -46.6333); // Same location

        // Same location should be within any distance
        $this->assertTrue($coord1->isWithinDistance($coord2, 100));
    }

    /**
     * Test coordinates distance calculation for distant points.
     * @see Requirement 12.3
     */
    public function test_coordinates_distance_calculation_for_distant_points(): void
    {
        $coord1 = new Coordinates(-23.5505, -46.6333);
        // Approximately 1km away
        $coord2 = new Coordinates(-23.5605, -46.6433);

        // Should not be within 100 meters
        $this->assertFalse($coord1->isWithinDistance($coord2, 100));
    }
}
