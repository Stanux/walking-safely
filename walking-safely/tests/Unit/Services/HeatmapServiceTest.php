<?php

namespace Tests\Unit\Services;

use App\Services\HeatmapService;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class HeatmapServiceTest extends TestCase
{
    private HeatmapService $heatmapService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->heatmapService = new HeatmapService();
    }

    /**
     * Test calculateGridSize returns appropriate size for different zoom levels.
     * @see Requirement 10.3
     */
    public function test_calculate_grid_size_adjusts_with_zoom(): void
    {
        // At zoom 1, grid should be large (~10 degrees)
        $sizeAtZoom1 = $this->heatmapService->calculateGridSize(1);
        $this->assertEquals(10.0, $sizeAtZoom1);

        // At higher zoom, grid should be smaller
        $sizeAtZoom10 = $this->heatmapService->calculateGridSize(10);
        $this->assertLessThan($sizeAtZoom1, $sizeAtZoom10);

        // At zoom 18, grid should be very small
        $sizeAtZoom18 = $this->heatmapService->calculateGridSize(18);
        $this->assertLessThan(0.001, $sizeAtZoom18);
    }

    /**
     * Test calculateGridSize clamps to valid range.
     */
    public function test_calculate_grid_size_clamps_invalid_zoom(): void
    {
        // Below minimum should use minimum
        $sizeAtZoom0 = $this->heatmapService->calculateGridSize(0);
        $sizeAtZoom1 = $this->heatmapService->calculateGridSize(1);
        $this->assertEquals($sizeAtZoom1, $sizeAtZoom0);

        // Above maximum should use maximum
        $sizeAtZoom20 = $this->heatmapService->calculateGridSize(20);
        $sizeAtZoom18 = $this->heatmapService->calculateGridSize(18);
        $this->assertEquals($sizeAtZoom18, $sizeAtZoom20);
    }
}
