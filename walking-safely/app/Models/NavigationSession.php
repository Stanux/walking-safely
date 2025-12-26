<?php

namespace App\Models;

use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Navigation session model for tracking active navigation.
 *
 * @see Requirement 3.1 - Track active navigation sessions for route recalculation
 */
class NavigationSession extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'route_data',
        'current_position',
        'original_duration',
        'current_duration',
        'max_risk_index',
        'started_at',
        'last_updated_at',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'route_data' => 'array',
            'current_position' => 'array',
            'original_duration' => 'integer',
            'current_duration' => 'integer',
            'max_risk_index' => 'float',
            'started_at' => 'datetime',
            'last_updated_at' => 'datetime',
        ];
    }

    /**
     * Session status constants.
     */
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    /**
     * Get the user this session belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the session is active.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Get the route as a Route value object.
     */
    public function getRoute(): ?Route
    {
        if (empty($this->route_data)) {
            return null;
        }

        return Route::fromArray($this->route_data);
    }

    /**
     * Set the route from a Route value object.
     */
    public function setRoute(Route $route): void
    {
        $this->route_data = $route->toArray();
    }

    /**
     * Get the current position as Coordinates.
     */
    public function getCurrentPosition(): ?Coordinates
    {
        if (empty($this->current_position)) {
            return null;
        }

        return Coordinates::fromArray($this->current_position);
    }

    /**
     * Set the current position from Coordinates.
     */
    public function setCurrentPosition(Coordinates $position): void
    {
        $this->current_position = $position->toArray();
    }

    /**
     * Calculate the time change percentage.
     */
    public function getTimeChangePercent(): float
    {
        if ($this->original_duration <= 0) {
            return 0;
        }

        return (($this->current_duration - $this->original_duration) / $this->original_duration) * 100;
    }

    /**
     * Check if time has increased significantly (> 10%).
     */
    public function hasSignificantTimeIncrease(): bool
    {
        return $this->getTimeChangePercent() > 10;
    }

    /**
     * Mark the session as completed.
     */
    public function complete(): void
    {
        $this->status = self::STATUS_COMPLETED;
        $this->save();
    }

    /**
     * Mark the session as cancelled.
     */
    public function cancel(): void
    {
        $this->status = self::STATUS_CANCELLED;
        $this->save();
    }

    /**
     * Update the current duration.
     */
    public function updateDuration(int $duration): void
    {
        $this->current_duration = $duration;
        $this->last_updated_at = now();
        $this->save();
    }

    /**
     * Update the max risk index.
     */
    public function updateMaxRiskIndex(float $riskIndex): void
    {
        $this->max_risk_index = $riskIndex;
        $this->save();
    }
}
