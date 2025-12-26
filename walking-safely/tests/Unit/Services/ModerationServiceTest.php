<?php

namespace Tests\Unit\Services;

use App\Enums\ModerationReason;
use App\Enums\ModerationStatus;
use App\Enums\OccurrenceSeverity;
use App\Enums\OccurrenceSource;
use App\Enums\OccurrenceStatus;
use App\Models\Occurrence;
use App\Services\ModerationService;
use MatanYadaev\EloquentSpatial\Objects\Point;
use Tests\TestCase;

class ModerationServiceTest extends TestCase
{
    private ModerationService $moderationService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->moderationService = new ModerationService();
    }

    /**
     * Test that official occurrences are not analyzed for anomalies.
     */
    public function test_official_occurrences_are_not_analyzed(): void
    {
        // Create a mock occurrence without database
        $occurrence = $this->createMock(Occurrence::class);
        $occurrence->method('__get')->willReturnMap([
            ['source', OccurrenceSource::OFFICIAL],
        ]);
        $occurrence->source = OccurrenceSource::OFFICIAL;

        $result = $this->moderationService->analyzeOccurrence($occurrence);

        $this->assertNull($result);
    }

    /**
     * Test that collaborative occurrences without user are not flagged for abuse.
     */
    public function test_collaborative_occurrences_without_user_not_flagged_for_abuse(): void
    {
        // Create a mock occurrence without database
        $occurrence = $this->createMock(Occurrence::class);
        $occurrence->method('__get')->willReturnMap([
            ['source', OccurrenceSource::COLLABORATIVE],
            ['created_by', null],
            ['id', 1],
            ['timestamp', now()],
            ['location', new Point(-23.5505, -46.6333)],
            ['crime_type_id', 1],
        ]);
        $occurrence->source = OccurrenceSource::COLLABORATIVE;
        $occurrence->created_by = null;

        // Abuse pattern detection requires a user
        $result = $this->moderationService->detectAbusePattern($occurrence);

        $this->assertNull($result);
    }

    /**
     * Test abuse pattern detection threshold.
     * @see Requirement 14.3
     */
    public function test_abuse_pattern_detection_threshold(): void
    {
        // The threshold is 3 similar reports
        $threshold = ModerationService::ABUSE_SIMILAR_REPORTS_THRESHOLD;
        $this->assertEquals(3, $threshold);
    }

    /**
     * Test high frequency detection threshold.
     */
    public function test_high_frequency_detection_threshold(): void
    {
        $threshold = ModerationService::HIGH_FREQUENCY_THRESHOLD;
        $this->assertEquals(4, $threshold);
    }

    /**
     * Test abuse time window is 60 minutes.
     */
    public function test_abuse_time_window_is_60_minutes(): void
    {
        $timeWindow = ModerationService::ABUSE_TIME_WINDOW_MINUTES;
        $this->assertEquals(60, $timeWindow);
    }

    /**
     * Test similarity distance is 500 meters.
     */
    public function test_similarity_distance_is_500_meters(): void
    {
        $distance = ModerationService::SIMILARITY_DISTANCE_METERS;
        $this->assertEquals(500, $distance);
    }

    /**
     * Test ModerationReason priorities.
     */
    public function test_moderation_reason_priorities(): void
    {
        // Abuse pattern should have highest priority
        $this->assertEquals(10, ModerationReason::ABUSE_PATTERN->getPriority());
        
        // High frequency should be second
        $this->assertEquals(8, ModerationReason::HIGH_FREQUENCY->getPriority());
        
        // User reported should have lowest priority
        $this->assertEquals(3, ModerationReason::USER_REPORTED->getPriority());
    }

    /**
     * Test ModerationStatus states.
     */
    public function test_moderation_status_states(): void
    {
        $this->assertTrue(ModerationStatus::PENDING->isPending());
        $this->assertFalse(ModerationStatus::APPROVED->isPending());
        $this->assertFalse(ModerationStatus::REJECTED->isPending());

        $this->assertFalse(ModerationStatus::PENDING->isResolved());
        $this->assertTrue(ModerationStatus::APPROVED->isResolved());
        $this->assertTrue(ModerationStatus::REJECTED->isResolved());
    }

    /**
     * Test ModerationReason descriptions.
     */
    public function test_moderation_reason_descriptions(): void
    {
        $this->assertNotEmpty(ModerationReason::ABUSE_PATTERN->getDescription());
        $this->assertNotEmpty(ModerationReason::HIGH_FREQUENCY->getDescription());
        $this->assertNotEmpty(ModerationReason::USER_REPORTED->getDescription());
        $this->assertNotEmpty(ModerationReason::ANOMALY_DETECTED->getDescription());
    }
}
