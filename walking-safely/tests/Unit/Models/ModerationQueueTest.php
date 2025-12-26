<?php

namespace Tests\Unit\Models;

use App\Enums\ModerationReason;
use App\Enums\ModerationStatus;
use App\Models\ModerationQueue;
use Tests\TestCase;

class ModerationQueueTest extends TestCase
{
    /**
     * Test ModerationQueue fillable attributes.
     */
    public function test_moderation_queue_has_correct_fillable_attributes(): void
    {
        $queue = new ModerationQueue();
        $fillable = $queue->getFillable();

        $this->assertContains('occurrence_id', $fillable);
        $this->assertContains('reported_by', $fillable);
        $this->assertContains('reason', $fillable);
        $this->assertContains('status', $fillable);
        $this->assertContains('moderated_by', $fillable);
        $this->assertContains('moderated_at', $fillable);
        $this->assertContains('moderator_notes', $fillable);
        $this->assertContains('detection_details', $fillable);
        $this->assertContains('priority', $fillable);
    }

    /**
     * Test ModerationQueue casts.
     */
    public function test_moderation_queue_has_correct_casts(): void
    {
        $queue = new ModerationQueue();
        $casts = $queue->getCasts();

        $this->assertEquals(ModerationReason::class, $casts['reason']);
        $this->assertEquals(ModerationStatus::class, $casts['status']);
        $this->assertEquals('datetime', $casts['moderated_at']);
        $this->assertEquals('array', $casts['detection_details']);
        $this->assertEquals('integer', $casts['priority']);
    }

    /**
     * Test isPending method.
     */
    public function test_is_pending_returns_true_for_pending_status(): void
    {
        $queue = new ModerationQueue(['status' => ModerationStatus::PENDING]);
        $this->assertTrue($queue->isPending());
    }

    /**
     * Test isPending method returns false for resolved status.
     */
    public function test_is_pending_returns_false_for_resolved_status(): void
    {
        $queue = new ModerationQueue(['status' => ModerationStatus::APPROVED]);
        $this->assertFalse($queue->isPending());

        $queue = new ModerationQueue(['status' => ModerationStatus::REJECTED]);
        $this->assertFalse($queue->isPending());
    }

    /**
     * Test isResolved method.
     */
    public function test_is_resolved_returns_true_for_approved_or_rejected(): void
    {
        $approved = new ModerationQueue(['status' => ModerationStatus::APPROVED]);
        $this->assertTrue($approved->isResolved());

        $rejected = new ModerationQueue(['status' => ModerationStatus::REJECTED]);
        $this->assertTrue($rejected->isResolved());
    }

    /**
     * Test isResolved method returns false for pending.
     */
    public function test_is_resolved_returns_false_for_pending(): void
    {
        $queue = new ModerationQueue(['status' => ModerationStatus::PENDING]);
        $this->assertFalse($queue->isResolved());
    }
}
