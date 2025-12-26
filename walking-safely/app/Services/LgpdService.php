<?php

namespace App\Services;

use App\Jobs\ProcessDataDeletionRequest;
use App\Models\AuditLog;
use App\Models\DataDeletionRequest;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Service for LGPD (Lei Geral de Proteção de Dados) compliance.
 *
 * @see Requirement 15.5 - Provide mechanism for user to request deletion of personal data
 */
class LgpdService
{
    /**
     * Create a data deletion request for a user.
     *
     * @see Requirement 15.5 - Provide mechanism for user to request deletion of personal data
     */
    public function requestDataDeletion(User $user, ?string $reason = null): DataDeletionRequest
    {
        // Check if there's already a pending request
        $existingRequest = DataDeletionRequest::forUser($user->id)
            ->whereIn('status', [DataDeletionRequest::STATUS_PENDING, DataDeletionRequest::STATUS_PROCESSING])
            ->first();

        if ($existingRequest) {
            return $existingRequest;
        }

        $request = DataDeletionRequest::create([
            'user_id' => $user->id,
            'status' => DataDeletionRequest::STATUS_PENDING,
            'reason' => $reason,
            'requested_at' => now(),
        ]);

        $this->logDeletionRequest($user, $request);

        // Dispatch the deletion job
        ProcessDataDeletionRequest::dispatch($request);

        Log::info('Data deletion request created', [
            'request_id' => $request->id,
            'user_id' => $user->id,
        ]);

        return $request;
    }

    /**
     * Get the status of a deletion request.
     */
    public function getDeletionRequestStatus(int $requestId): ?DataDeletionRequest
    {
        return DataDeletionRequest::find($requestId);
    }

    /**
     * Get all deletion requests for a user.
     */
    public function getUserDeletionRequests(User $user): \Illuminate\Database\Eloquent\Collection
    {
        return DataDeletionRequest::forUser($user->id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Check if a user has a pending deletion request.
     */
    public function hasPendingDeletionRequest(User $user): bool
    {
        return DataDeletionRequest::forUser($user->id)
            ->whereIn('status', [DataDeletionRequest::STATUS_PENDING, DataDeletionRequest::STATUS_PROCESSING])
            ->exists();
    }

    /**
     * Export user data for portability (LGPD right to data portability).
     */
    public function exportUserData(User $user): array
    {
        $data = [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'locale' => $user->locale,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'alert_preferences' => $user->alertPreference?->toArray(),
            'navigation_sessions' => [],
            'occurrences' => [],
            'export_timestamp' => now()->toIso8601String(),
        ];

        // Get navigation sessions (limited data)
        $data['navigation_sessions'] = \DB::table('navigation_sessions')
            ->where('user_id', $user->id)
            ->select(['started_at', 'status', 'original_duration', 'max_risk_index'])
            ->get()
            ->toArray();

        // Get occurrences created by user
        $data['occurrences'] = \DB::table('occurrences')
            ->where('created_by', $user->id)
            ->select(['timestamp', 'crime_type_id', 'severity', 'confidence_score', 'status'])
            ->get()
            ->toArray();

        return $data;
    }

    /**
     * Log the deletion request to audit log.
     */
    protected function logDeletionRequest(User $user, DataDeletionRequest $request): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'data_deletion_requested',
            'target_type' => DataDeletionRequest::class,
            'target_id' => $request->id,
            'details' => [
                'reason' => $request->reason,
                'timestamp' => now()->toIso8601String(),
            ],
            'ip_address' => request()->ip(),
        ]);
    }
}
