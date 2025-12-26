<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    /**
     * Common audit action types.
     */
    public const ACTION_PERMISSION_CHANGED = 'permission_changed';
    public const ACTION_USER_CREATED = 'user_created';
    public const ACTION_USER_UPDATED = 'user_updated';
    public const ACTION_USER_DELETED = 'user_deleted';
    public const ACTION_MODERATION_APPROVED = 'moderation_approved';
    public const ACTION_MODERATION_REJECTED = 'moderation_rejected';
    public const ACTION_LOGIN_SUCCESS = 'login_success';
    public const ACTION_LOGIN_FAILED = 'login_failed';
    public const ACTION_ACCOUNT_LOCKED = 'account_locked';
    public const ACTION_TRANSLATION_UPDATED = 'translation_updated';
    public const ACTION_TAXONOMY_UPDATED = 'taxonomy_updated';
    public const ACTION_ETL_IMPORT = 'etl_import';
    public const ACTION_ETL_IMPORT_FAILED = 'etl_import_failed';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'target_type',
        'target_id',
        'details',
        'ip_address',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'details' => 'array',
        ];
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the target model of the audit action.
     */
    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Create an audit log entry.
     */
    public static function log(
        string $action,
        ?int $userId = null,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $details = null,
        ?string $ipAddress = null
    ): self {
        return self::create([
            'user_id' => $userId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'details' => $details,
            'ip_address' => $ipAddress ?? request()->ip(),
        ]);
    }

    /**
     * Log a permission change action.
     */
    public static function logPermissionChange(
        User $admin,
        User $targetUser,
        string $oldRole,
        string $newRole
    ): self {
        return self::log(
            action: self::ACTION_PERMISSION_CHANGED,
            userId: $admin->id,
            targetType: User::class,
            targetId: $targetUser->id,
            details: [
                'old_role' => $oldRole,
                'new_role' => $newRole,
            ]
        );
    }

    /**
     * Log a moderation decision.
     */
    public static function logModerationDecision(
        User $moderator,
        Model $target,
        string $decision,
        ?string $reason = null
    ): self {
        $action = $decision === 'approved'
            ? self::ACTION_MODERATION_APPROVED
            : self::ACTION_MODERATION_REJECTED;

        return self::log(
            action: $action,
            userId: $moderator->id,
            targetType: get_class($target),
            targetId: $target->id,
            details: [
                'decision' => $decision,
                'reason' => $reason,
            ]
        );
    }

    /**
     * Log a login attempt.
     */
    public static function logLoginAttempt(
        ?User $user,
        bool $success,
        ?string $email = null
    ): self {
        return self::log(
            action: $success ? self::ACTION_LOGIN_SUCCESS : self::ACTION_LOGIN_FAILED,
            userId: $user?->id,
            details: [
                'email' => $email ?? $user?->email,
                'success' => $success,
            ]
        );
    }

    /**
     * Log an account lockout.
     */
    public static function logAccountLocked(User $user): self
    {
        return self::log(
            action: self::ACTION_ACCOUNT_LOCKED,
            userId: $user->id,
            targetType: User::class,
            targetId: $user->id,
            details: [
                'locked_until' => $user->locked_until?->toIso8601String(),
                'failed_attempts' => $user->failed_login_attempts,
            ]
        );
    }
}
