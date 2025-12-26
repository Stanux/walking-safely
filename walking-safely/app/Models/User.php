<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The number of failed login attempts before account is locked.
     */
    public const MAX_FAILED_ATTEMPTS = 5;

    /**
     * The duration of account lockout in minutes.
     */
    public const LOCKOUT_DURATION_MINUTES = 15;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'locale',
        'failed_login_attempts',
        'locked_until',
        'two_factor_enabled',
        'location_permission_granted',
        'location_permission_granted_at',
        'location_permission_revoked_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'locked_until' => 'datetime',
            'two_factor_enabled' => 'boolean',
            'failed_login_attempts' => 'integer',
            'location_permission_granted' => 'boolean',
            'location_permission_granted_at' => 'datetime',
            'location_permission_revoked_at' => 'datetime',
        ];
    }

    /**
     * Check if the user has granted location permission.
     */
    public function hasLocationPermission(): bool
    {
        return $this->location_permission_granted === true;
    }

    /**
     * Check if the user account is currently locked.
     */
    public function isLocked(): bool
    {
        if ($this->locked_until === null) {
            return false;
        }

        return $this->locked_until->isFuture();
    }

    /**
     * Increment failed login attempts and lock account if threshold exceeded.
     */
    public function incrementFailedAttempts(): void
    {
        $this->failed_login_attempts++;

        if ($this->failed_login_attempts >= self::MAX_FAILED_ATTEMPTS) {
            $this->locked_until = now()->addMinutes(self::LOCKOUT_DURATION_MINUTES);
        }

        $this->save();
    }

    /**
     * Reset failed login attempts after successful login.
     */
    public function resetFailedAttempts(): void
    {
        $this->failed_login_attempts = 0;
        $this->locked_until = null;
        $this->save();
    }

    /**
     * Get the remaining lockout time in seconds.
     */
    public function getRemainingLockoutSeconds(): int
    {
        if (!$this->isLocked()) {
            return 0;
        }

        return (int) now()->diffInSeconds($this->locked_until, false);
    }

    /**
     * Check if the user has moderator privileges.
     */
    public function hasModeratorPrivileges(): bool
    {
        return $this->role->hasModeratorPrivileges();
    }

    /**
     * Check if the user has admin privileges.
     */
    public function hasAdminPrivileges(): bool
    {
        return $this->role->hasAdminPrivileges();
    }

    /**
     * Get the audit logs created by this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Get the translations updated by this user.
     */
    public function translations(): HasMany
    {
        return $this->hasMany(Translation::class, 'updated_by');
    }

    /**
     * Get the alert preferences for this user.
     */
    public function alertPreference(): HasOne
    {
        return $this->hasOne(AlertPreference::class);
    }
}
