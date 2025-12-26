<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model for tracking data deletion requests (LGPD compliance).
 *
 * @see Requirement 15.5 - Provide mechanism for user to request deletion of personal data
 */
class DataDeletionRequest extends Model
{
    /**
     * Status constants.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'status',
        'reason',
        'requested_at',
        'processed_at',
        'completed_at',
        'deletion_summary',
        'processed_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'processed_at' => 'datetime',
            'completed_at' => 'datetime',
            'deletion_summary' => 'array',
        ];
    }

    /**
     * Get the user who requested the deletion.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the request is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if the request is processing.
     */
    public function isProcessing(): bool
    {
        return $this->status === self::STATUS_PROCESSING;
    }

    /**
     * Check if the request is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if the request failed.
     */
    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Mark the request as processing.
     */
    public function markAsProcessing(): void
    {
        $this->status = self::STATUS_PROCESSING;
        $this->processed_at = now();
        $this->save();
    }

    /**
     * Mark the request as completed.
     */
    public function markAsCompleted(array $summary, ?string $processedBy = null): void
    {
        $this->status = self::STATUS_COMPLETED;
        $this->completed_at = now();
        $this->deletion_summary = $summary;
        $this->processed_by = $processedBy ?? 'system';
        $this->save();
    }

    /**
     * Mark the request as failed.
     */
    public function markAsFailed(string $reason): void
    {
        $this->status = self::STATUS_FAILED;
        $this->deletion_summary = ['error' => $reason];
        $this->save();
    }

    /**
     * Scope to get pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to get requests for a specific user.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
