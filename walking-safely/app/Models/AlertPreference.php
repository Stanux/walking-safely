<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Alert preference model for user alert settings.
 *
 * @see Requirement 6.3 - Enable/disable alerts by occurrence type
 * @see Requirement 6.5 - Define specific hours for alert activation
 */
class AlertPreference extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'alerts_enabled',
        'enabled_crime_types',
        'active_hours_start',
        'active_hours_end',
        'active_days',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'alerts_enabled' => 'boolean',
            'enabled_crime_types' => 'array',
            'active_hours_start' => 'string',
            'active_hours_end' => 'string',
            'active_days' => 'array',
        ];
    }

    /**
     * Days of the week constants.
     */
    public const MONDAY = 1;
    public const TUESDAY = 2;
    public const WEDNESDAY = 3;
    public const THURSDAY = 4;
    public const FRIDAY = 5;
    public const SATURDAY = 6;
    public const SUNDAY = 0;

    /**
     * Get the user this preference belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if a specific crime type is enabled for alerts.
     *
     * @param int $crimeTypeId
     * @return bool
     *
     * @see Requirement 6.3 - Filter by occurrence type
     */
    public function isCrimeTypeEnabled(int $crimeTypeId): bool
    {
        // If no specific crime types are set, all are enabled
        if (empty($this->enabled_crime_types)) {
            return true;
        }

        return in_array($crimeTypeId, $this->enabled_crime_types);
    }

    /**
     * Check if alerts are active at the current time.
     *
     * @return bool
     *
     * @see Requirement 6.5 - Time-based alert activation
     */
    public function isActiveAtCurrentTime(): bool
    {
        // If no time restrictions, always active
        if ($this->active_hours_start === null && $this->active_hours_end === null) {
            return true;
        }

        // Check day of week
        if (!$this->isActiveOnCurrentDay()) {
            return false;
        }

        // Check time of day
        return $this->isActiveAtCurrentHour();
    }

    /**
     * Check if alerts are active on the current day.
     *
     * @return bool
     */
    public function isActiveOnCurrentDay(): bool
    {
        // If no specific days are set, all days are active
        if (empty($this->active_days)) {
            return true;
        }

        $currentDay = (int) now()->format('w'); // 0 = Sunday, 6 = Saturday
        return in_array($currentDay, $this->active_days);
    }

    /**
     * Check if alerts are active at the current hour.
     *
     * @return bool
     */
    public function isActiveAtCurrentHour(): bool
    {
        // If no time restrictions, always active
        if ($this->active_hours_start === null || $this->active_hours_end === null) {
            return true;
        }

        $currentTime = now()->format('H:i');
        $startTime = $this->active_hours_start;
        $endTime = $this->active_hours_end;

        // Handle overnight ranges (e.g., 22:00 to 06:00)
        if ($startTime > $endTime) {
            // Active if current time is after start OR before end
            return $currentTime >= $startTime || $currentTime <= $endTime;
        }

        // Normal range (e.g., 08:00 to 18:00)
        return $currentTime >= $startTime && $currentTime <= $endTime;
    }

    /**
     * Enable a specific crime type for alerts.
     *
     * @param int $crimeTypeId
     */
    public function enableCrimeType(int $crimeTypeId): void
    {
        $types = $this->enabled_crime_types ?? [];

        if (!in_array($crimeTypeId, $types)) {
            $types[] = $crimeTypeId;
            $this->enabled_crime_types = $types;
        }
    }

    /**
     * Disable a specific crime type for alerts.
     *
     * @param int $crimeTypeId
     */
    public function disableCrimeType(int $crimeTypeId): void
    {
        $types = $this->enabled_crime_types ?? [];
        $types = array_filter($types, fn($id) => $id !== $crimeTypeId);
        $this->enabled_crime_types = array_values($types);
    }

    /**
     * Set the active hours for alerts.
     *
     * @param string|null $start Start time in HH:MM format
     * @param string|null $end End time in HH:MM format
     */
    public function setActiveHours(?string $start, ?string $end): void
    {
        $this->active_hours_start = $start;
        $this->active_hours_end = $end;
    }

    /**
     * Set the active days for alerts.
     *
     * @param array $days Array of day constants (0-6)
     */
    public function setActiveDays(array $days): void
    {
        // Validate days are in valid range
        $validDays = array_filter($days, fn($day) => $day >= 0 && $day <= 6);
        $this->active_days = array_values(array_unique($validDays));
    }

    /**
     * Enable alerts only during night hours (default: 18:00 to 06:00).
     */
    public function enableNightOnlyAlerts(): void
    {
        $this->setActiveHours('18:00', '06:00');
    }

    /**
     * Enable alerts only during weekends.
     */
    public function enableWeekendOnlyAlerts(): void
    {
        $this->setActiveDays([self::SATURDAY, self::SUNDAY]);
    }

    /**
     * Clear all time restrictions (alerts always active).
     */
    public function clearTimeRestrictions(): void
    {
        $this->active_hours_start = null;
        $this->active_hours_end = null;
        $this->active_days = [];
    }

    /**
     * Clear all crime type restrictions (all types enabled).
     */
    public function clearCrimeTypeRestrictions(): void
    {
        $this->enabled_crime_types = [];
    }
}
