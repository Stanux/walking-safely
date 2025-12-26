<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OccurrenceValidation extends Model
{
    /**
     * Validation types.
     */
    public const TYPE_CORROBORATION = 'corroboration';
    public const TYPE_OFFICIAL_CONFIRMATION = 'official_confirmation';
    public const TYPE_MODERATION = 'moderation';

    /**
     * Validation statuses.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'occurrence_id',
        'validated_by',
        'validation_type',
        'status',
        'notes',
        'metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    /**
     * Get the occurrence being validated.
     */
    public function occurrence(): BelongsTo
    {
        return $this->belongsTo(Occurrence::class);
    }

    /**
     * Get the user who performed the validation.
     */
    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    /**
     * Check if this is a corroboration validation.
     */
    public function isCorroboration(): bool
    {
        return $this->validation_type === self::TYPE_CORROBORATION;
    }

    /**
     * Check if this validation is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Check if this validation is rejected.
     */
    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /**
     * Check if this validation is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
