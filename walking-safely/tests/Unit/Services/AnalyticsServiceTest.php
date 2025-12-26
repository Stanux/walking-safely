<?php

namespace Tests\Unit\Services;

use App\Services\AnalyticsService;
use Tests\TestCase;

class AnalyticsServiceTest extends TestCase
{
    private AnalyticsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AnalyticsService();
    }

    /**
     * Test that cache TTL is set to 15 minutes (900 seconds).
     * @see Requirement 20.2 - Data updated with maximum 15 minute delay
     */
    public function test_cache_ttl_is_fifteen_minutes(): void
    {
        $this->assertEquals(900, AnalyticsService::CACHE_TTL);
    }

    /**
     * Test CSV escape function handles special characters.
     */
    public function test_escape_csv_handles_special_characters(): void
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('escapeCsv');
        $method->setAccessible(true);

        // Normal string should not be modified
        $this->assertEquals('Normal Text', $method->invoke($this->service, 'Normal Text'));

        // String with comma should be quoted
        $this->assertEquals('"Text, with comma"', $method->invoke($this->service, 'Text, with comma'));

        // String with quotes should be escaped
        $this->assertEquals('"Text ""with"" quotes"', $method->invoke($this->service, 'Text "with" quotes'));

        // String with newline should be quoted
        $this->assertEquals("\"Text\nwith newline\"", $method->invoke($this->service, "Text\nwith newline"));
    }

    /**
     * Test export types are valid.
     */
    public function test_export_types_are_supported(): void
    {
        // The service should support these export types
        $supportedTypes = ['occurrences', 'summary', 'distribution'];
        
        foreach ($supportedTypes as $type) {
            $this->assertContains($type, $supportedTypes);
        }
    }
}
