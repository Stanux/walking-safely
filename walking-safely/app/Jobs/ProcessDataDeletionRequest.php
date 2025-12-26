<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\DataDeletionRequest;
use App\Models\User;
use App\Services\LocationPermissionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Job to process data deletion requests for LGPD compliance.
 *
 * @see Requirement 15.5 - Provide mechanism for user to request deletion of personal data
 */
class ProcessDataDeletionRequest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public DataDeletionRequest $request
    ) {}

    /**
     * Execute the job.
     */
    public function handle(LocationPermissionService $locationPermissionService): void
    {
        Log::info('Processing data deletion request', [
            'request_id' => $this->request->id,
            'user_id' => $this->request->user_id,
        ]);

        $this->request->markAsProcessing();

        try {
            $user = $this->request->user;

            if (!$user) {
                throw new \Exception('User not found');
            }

            $summary = $this->deleteUserData($user, $locationPermissionService);

            $this->request->markAsCompleted($summary);

            Log::info('Data deletion request completed', [
                'request_id' => $this->request->id,
                'summary' => $summary,
            ]);
        } catch (\Exception $e) {
            Log::error('Data deletion request failed', [
                'request_id' => $this->request->id,
                'error' => $e->getMessage(),
            ]);

            $this->request->markAsFailed($e->getMessage());

            throw $e;
        }
    }

    /**
     * Delete all personal data for a user.
     */
    protected function deleteUserData(User $user, LocationPermissionService $locationPermissionService): array
    {
        $summary = [
            'navigation_sessions' => 0,
            'occurrences_anonymized' => 0,
            'occurrence_validations' => 0,
            'alert_preferences' => 0,
            'audit_logs_anonymized' => 0,
            'translations_updated' => 0,
            'location_cache_cleared' => false,
            'user_deleted' => false,
        ];

        DB::beginTransaction();

        try {
            // 1. Clear location cache
            $locationPermissionService->clearUserLocationCache($user);
            $summary['location_cache_cleared'] = true;

            // 2. Delete navigation sessions
            $summary['navigation_sessions'] = DB::table('navigation_sessions')
                ->where('user_id', $user->id)
                ->delete();

            // 3. Anonymize occurrences (keep for statistics but remove user association)
            $summary['occurrences_anonymized'] = DB::table('occurrences')
                ->where('created_by', $user->id)
                ->update([
                    'created_by' => null,
                    'updated_at' => now(),
                ]);

            // 4. Delete occurrence validations
            $summary['occurrence_validations'] = DB::table('occurrence_validations')
                ->where('user_id', $user->id)
                ->delete();

            // 5. Delete alert preferences
            $summary['alert_preferences'] = DB::table('alert_preferences')
                ->where('user_id', $user->id)
                ->delete();

            // 6. Anonymize audit logs (keep for compliance but remove user details)
            $summary['audit_logs_anonymized'] = DB::table('audit_logs')
                ->where('user_id', $user->id)
                ->update([
                    'user_id' => null,
                    'ip_address' => null,
                    'details' => json_encode(['anonymized' => true, 'reason' => 'LGPD deletion request']),
                    'updated_at' => now(),
                ]);

            // 7. Update translations to remove user reference
            $summary['translations_updated'] = DB::table('translations')
                ->where('updated_by', $user->id)
                ->update([
                    'updated_by' => null,
                    'updated_at' => now(),
                ]);

            // 8. Create final audit log entry before deletion
            $this->createDeletionAuditLog($user);

            // 9. Delete the user account
            $user->delete();
            $summary['user_deleted'] = true;

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $summary;
    }

    /**
     * Create an audit log entry for the deletion.
     */
    protected function createDeletionAuditLog(User $user): void
    {
        AuditLog::create([
            'user_id' => null, // Will be null since user is being deleted
            'action' => 'user_data_deleted_lgpd',
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [
                'email_hash' => hash('sha256', $user->email),
                'deletion_timestamp' => now()->toIso8601String(),
                'reason' => 'LGPD data deletion request',
            ],
            'ip_address' => null,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Data deletion job failed permanently', [
            'request_id' => $this->request->id,
            'error' => $exception->getMessage(),
        ]);

        $this->request->markAsFailed($exception->getMessage());
    }
}
