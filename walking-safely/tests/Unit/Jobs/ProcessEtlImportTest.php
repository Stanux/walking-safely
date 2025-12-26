<?php

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessEtlImport;
use Tests\TestCase;

class ProcessEtlImportTest extends TestCase
{
    /**
     * Test job can be instantiated with required parameters.
     */
    public function test_job_can_be_instantiated(): void
    {
        $records = [
            ['latitude' => -23.5505, 'longitude' => -46.6333, 'timestamp' => now(), 'crime_code' => 'TEST'],
        ];

        $job = new ProcessEtlImport($records, 'test_source');

        $this->assertInstanceOf(ProcessEtlImport::class, $job);
    }

    /**
     * Test job can be created with optional parameters.
     */
    public function test_job_can_be_created_with_optional_parameters(): void
    {
        $records = [
            ['latitude' => -23.5505, 'longitude' => -46.6333, 'timestamp' => now(), 'crime_code' => 'TEST'],
        ];

        $job = new ProcessEtlImport(
            $records,
            'test_source',
            userId: 1,
            defaultCrimeTypeId: 5,
            notifyOnComplete: true
        );

        $this->assertInstanceOf(ProcessEtlImport::class, $job);
    }

    /**
     * Test job has correct retry configuration.
     */
    public function test_job_has_correct_retry_configuration(): void
    {
        $job = new ProcessEtlImport([], 'test_source');

        $this->assertEquals(3, $job->tries);
        $this->assertEquals(60, $job->backoff);
        $this->assertEquals(3, $job->maxExceptions);
    }

    /**
     * Test job tags include source and record count.
     */
    public function test_job_tags_include_source_and_record_count(): void
    {
        $records = [
            ['latitude' => -23.5505, 'longitude' => -46.6333, 'timestamp' => now(), 'crime_code' => 'TEST'],
            ['latitude' => -23.5506, 'longitude' => -46.6334, 'timestamp' => now(), 'crime_code' => 'TEST'],
        ];

        $job = new ProcessEtlImport($records, 'ssp_sp');
        $tags = $job->tags();

        $this->assertContains('etl', $tags);
        $this->assertContains('source:ssp_sp', $tags);
        $this->assertContains('records:2', $tags);
    }

    /**
     * Test fromSource static factory method.
     */
    public function test_from_source_factory_method(): void
    {
        $records = [
            ['latitude' => -23.5505, 'longitude' => -46.6333, 'timestamp' => now(), 'crime_code' => 'TEST'],
        ];

        $job = ProcessEtlImport::fromSource($records, 'delegacia_rj', 1);

        $this->assertInstanceOf(ProcessEtlImport::class, $job);
    }

    /**
     * Test withNotification fluent method.
     */
    public function test_with_notification_fluent_method(): void
    {
        $job = new ProcessEtlImport([], 'test_source');
        $result = $job->withNotification();

        $this->assertSame($job, $result);
    }

    /**
     * Test withDefaultCrimeType fluent method.
     */
    public function test_with_default_crime_type_fluent_method(): void
    {
        $job = new ProcessEtlImport([], 'test_source');
        $result = $job->withDefaultCrimeType(5);

        $this->assertSame($job, $result);
    }
}
