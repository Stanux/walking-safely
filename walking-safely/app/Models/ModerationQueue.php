<?php

namespace App\Models;

use App\Enums\ModerationReason;
use App\Enums\ModerationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationQueue extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'occurrence_id',
        'reported_by',
        'reason',
        'status',
        'moderated_by',
        'moderated_at',
        'moderator_notes',
        'detection_details',
        'priority',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reason' => ModerationReason::class,
            'status' => ModerationStatus::class,
            'moderated_at' => 'datetime',
            'detection_details' => 'array',
            'priority' => 'integer',
        ];
    }

    /**
     * Get the occurrence being moderated.
     */
    public function occurrence(): BelongsTo
    {
        return $this->belongsTo(Occurrence::class);
    }

    /**
     * Get the user who reported this item.
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the moderator who handled this item.
     */
    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    /**
     * Scope to filter pending items.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', ModerationStatus::PENDING);
    }

    /**
     * Scope to filter approved items.
     */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', ModerationStatus::APPROVED);
    }

    /**
     * Scope to filter rejected items.
     */
    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', ModerationStatus::REJECTED);
    }

    /**
     * Scope to filter by reason.
     */
    public function scopeByReason(Builder $query, ModerationReason $reason): Builder
    {
        return $query->where('reason', $reason);
    }

    /**
     * Scope to order by priority (highest first).
     */
    public function scopeOrderByPriority(Builder $query): Builder
    {
        return $query->orderBy('priority', 'desc')->orderBy('created_at', 'asc');
    }

    /**
     * Check if this item is pending moderation.
     */
    public function isPending(): bool
    {
        return $this->status === ModerationStatus::PENDING;
    }

    /**
     * Check if this item has been resolved.
     */
    public function isResolved(): bool
    {
        return $this->status->isResolved();
    }

    /**
     * Approve this moderation item.
     */
    public function approve(User $moderator, ?string $notes = null): void
    {
        $this->status = ModerationStatus::APPROVED;
        $this->moderated_by = $moderator->id;
        $this->moderated_at = now();
        $this->moderator_notes = $notes;
        $this->save();

        // Log the moderation decision
        AuditLog::logModerationDecision(
            moderator: $moderator,
            target: $this->occurrence,
            decision: 'approved',
            reason: $notes
        );
    }

    /**
     * Reject this moderation item.
     */
    public function reject(User $moderator, ?string $notes = null): void
    {
        $this->status = ModerationStatus::REJECTED;
        $this->moderated_by = $moderator->id;
        $this->moderated_at = now();
        $this->moderator_notes = $notes;
        $this->save();

        // Mark the occurrence as rejected
        $this->occurrence->markAsRejected();

        // Log the moderation decision
        AuditLog::logModerationDecision(
            moderator: $moderator,
            target: $this->occurrence,
            decision: 'rejected',
            reason: $notes
        );
    }

    /**
     * Add an item to the moderation queue.
     */
    public static function addToQueue(
        Occurrence $occurrence,
        ModerationReason $reason,
        ?int $reportedBy = null,
        ?array $detectionDetails = null
    ): self {
        // Check if already in queue with pending status
        $existing = self::where('occurrence_id', $occurrence->id)
            ->pending()
            ->first();

        if ($existing) {
            // Update priority if new reason has higher priority
            if ($reason->getPriority() > $existing->priority) {
                $existing->priority = $reason->getPriority();
                $existing->reason = $reason;
                $existing->detection_details = array_merge(
                    $existing->detection_details ?? [],
                    $detectionDetails ?? []
                );
                $existing->save();
            }
            return $existing;
        }

        return self::create([
            'occurrence_id' => $occurrence->id,
            'reported_by' => $reportedBy,
            'reason' => $reason,
            'status' => ModerationStatus::PENDING,
            'detection_details' => $detectionDetails,
            'priority' => $reason->getPriority(),
        ]);
    }
}
