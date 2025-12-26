<?php

namespace Tests\Unit\Services;

use App\Jobs\ProcessDataDeletionRequest;
use App\Models\DataDeletionRequest;
use App\Models\User;
use App\Services\LgpdService;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

/**
 * Tests for LgpdService.
 *
 * @see Requirement 15.5 - Provide mechanism for user to request deletion of personal data
 */
class LgpdServiceTest extends TestCase
{
    private LgpdService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LgpdService();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_data_deletion_request_status_constants_are_defined(): void
    {
        $this->assertEquals('pending', DataDeletionRequest::STATUS_PENDING);
        $this->assertEquals('processing', DataDeletionRequest::STATUS_PROCESSING);
        $this->assertEquals('completed', DataDeletionRequest::STATUS_COMPLETED);
        $this->assertEquals('failed', DataDeletionRequest::STATUS_FAILED);
    }

    public function test_data_deletion_request_is_pending_returns_true(): void
    {
        $request = new DataDeletionRequest(['status' => DataDeletionRequest::STATUS_PENDING]);

        $this->assertTrue($request->isPending());
        $this->assertFalse($request->isProcessing());
        $this->assertFalse($request->isCompleted());
        $this->assertFalse($request->isFailed());
    }

    public function test_data_deletion_request_is_processing_returns_true(): void
    {
        $request = new DataDeletionRequest(['status' => DataDeletionRequest::STATUS_PROCESSING]);

        $this->assertFalse($request->isPending());
        $this->assertTrue($request->isProcessing());
        $this->assertFalse($request->isCompleted());
        $this->assertFalse($request->isFailed());
    }

    public function test_data_deletion_request_is_completed_returns_true(): void
    {
        $request = new DataDeletionRequest(['status' => DataDeletionRequest::STATUS_COMPLETED]);

        $this->assertFalse($request->isPending());
        $this->assertFalse($request->isProcessing());
        $this->assertTrue($request->isCompleted());
        $this->assertFalse($request->isFailed());
    }

    public function test_data_deletion_request_is_failed_returns_true(): void
    {
        $request = new DataDeletionRequest(['status' => DataDeletionRequest::STATUS_FAILED]);

        $this->assertFalse($request->isPending());
        $this->assertFalse($request->isProcessing());
        $this->assertFalse($request->isCompleted());
        $this->assertTrue($request->isFailed());
    }

    public function test_export_user_data_method_exists(): void
    {
        // Verify the export method exists on the service
        $this->assertTrue(method_exists($this->service, 'exportUserData'));
    }

    public function test_lgpd_service_has_required_methods(): void
    {
        // Verify all required LGPD methods exist
        $this->assertTrue(method_exists($this->service, 'requestDataDeletion'));
        $this->assertTrue(method_exists($this->service, 'getDeletionRequestStatus'));
        $this->assertTrue(method_exists($this->service, 'getUserDeletionRequests'));
        $this->assertTrue(method_exists($this->service, 'hasPendingDeletionRequest'));
        $this->assertTrue(method_exists($this->service, 'exportUserData'));
    }

    public function test_process_data_deletion_request_job_has_retry_attempts(): void
    {
        $request = new DataDeletionRequest([
            'user_id' => 1,
            'status' => DataDeletionRequest::STATUS_PENDING,
        ]);

        $job = new ProcessDataDeletionRequest($request);

        $this->assertEquals(3, $job->tries);
    }
}
