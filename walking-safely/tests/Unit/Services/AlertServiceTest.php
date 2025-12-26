<?php

namespace Tests\Unit\Services;

use App\Models\AlertPreference;
use App\Models\RiskIndex;
use App\Services\AlertService;
use App\Services\RiskService;
use App\ValueObjects\Coordinates;
use Mockery;
use Tests\TestCase;

class AlertServiceTest extends TestCase
{
    private AlertService $alertService;
    private RiskService $riskServiceMock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->riskServiceMock = Mockery::mock(RiskService::class);
        $this->alertService = new AlertService($this->riskServiceMock);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Test calculateAlertDistance returns minimum distance for stationary users.
     */
    public function test_calculate_alert_distance_returns_minimum_for_stationary(): void
    {
        $distance = $this->alertService->calculateAlertDistance(0);

        $this->assertEquals(AlertService::MIN_ALERT_DISTANCE, $distance);
    }

    /**
     * Test calculateAlertDistance returns at least 500m for speeds above 40 km/h.
     * @see Requirement 6.4
     */
    public function test_calculate_alert_distance_returns_at_least_500m_for_high_speed(): void
    {
        // Test at exactly 40 km/h threshold
        $distance = $this->alertService->calculateAlertDistance(41);
        $this->assertGreaterThanOrEqual(AlertService::HIGH_SPEED_ALERT_DISTANCE, $distance);

        // Test at higher speed
        $distance = $this->alertService->calculateAlertDistance(80);
        $this->assertGreaterThanOrEqual(AlertService::HIGH_SPEED_ALERT_DISTANCE, $distance);

        // Test at very high speed
        $distance = $this->alertService->calculateAlertDistance(120);
        $this->assertGreaterThanOrEqual(AlertService::HIGH_SPEED_ALERT_DISTANCE, $distance);
    }

    /**
     * Test calculateAlertDistance scales with speed for low speeds.
     */
    public function test_calculate_alert_distance_scales_with_low_speed(): void
    {
        $distanceAt20 = $this->alertService->calculateAlertDistance(20);
        $distanceAt30 = $this->alertService->calculateAlertDistance(30);

        // Higher speed should result in greater distance
        $this->assertGreaterThan($distanceAt20, $distanceAt30);
    }

    /**
     * Test calculateAlertDistance handles negative speed gracefully.
     */
    public function test_calculate_alert_distance_handles_negative_speed(): void
    {
        $distance = $this->alertService->calculateAlertDistance(-10);

        $this->assertEquals(AlertService::MIN_ALERT_DISTANCE, $distance);
    }

    /**
     * Test checkAlertConditions returns alert for high risk region.
     * @see Requirement 6.1
     */
    public function test_check_alert_conditions_returns_alert_for_high_risk(): void
    {
        $position = new Coordinates(-23.5505, -46.6333);
        $speed = 50.0;

        $riskIndex = new RiskIndex([
            'region_id' => 1,
            'value' => 75.0, // High risk (>= 70)
            'dominant_crime_type_id' => 1,
        ]);

        $this->riskServiceMock
            ->shouldReceive('getRiskForCoordinates')
            ->with(Mockery::type(Coordinates::class))
            ->andReturn($riskIndex);

        $alerts = $this->alertService->checkAlertConditions($position, $speed);

        $this->assertNotEmpty($alerts);
        $this->assertEquals('high_risk_region', $alerts[0]['type']);
        $this->assertEquals(75.0, $alerts[0]['risk_index']);
        $this->assertTrue($alerts[0]['requires_visual']);
        $this->assertTrue($alerts[0]['requires_sound']);
    }

    /**
     * Test checkAlertConditions returns no alert for low risk region.
     */
    public function test_check_alert_conditions_returns_no_alert_for_low_risk(): void
    {
        $position = new Coordinates(-23.5505, -46.6333);
        $speed = 50.0;

        $riskIndex = new RiskIndex([
            'region_id' => 1,
            'value' => 30.0, // Low risk (< 70)
            'dominant_crime_type_id' => 1,
        ]);

        $this->riskServiceMock
            ->shouldReceive('getRiskForCoordinates')
            ->with(Mockery::type(Coordinates::class))
            ->andReturn($riskIndex);

        $alerts = $this->alertService->checkAlertConditions($position, $speed);

        $this->assertEmpty($alerts);
    }

    /**
     * Test checkAlertConditions respects disabled alerts preference.
     */
    public function test_check_alert_conditions_respects_disabled_preference(): void
    {
        $position = new Coordinates(-23.5505, -46.6333);
        $speed = 50.0;

        $riskIndex = new RiskIndex([
            'region_id' => 1,
            'value' => 75.0, // High risk
            'dominant_crime_type_id' => 1,
        ]);

        $preference = new AlertPreference([
            'alerts_enabled' => false,
        ]);

        $this->riskServiceMock
            ->shouldReceive('getRiskForCoordinates')
            ->with(Mockery::type(Coordinates::class))
            ->andReturn($riskIndex);

        $alerts = $this->alertService->checkAlertConditions($position, $speed, $preference);

        $this->assertEmpty($alerts);
    }
}
