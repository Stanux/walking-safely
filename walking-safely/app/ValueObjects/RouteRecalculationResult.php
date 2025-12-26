<?php

namespace App\ValueObjects;

use JsonSerializable;

/**
 * Result of a route recalculation during active navigation.
 *
 * @see Requirement 3.1 - Recalculate route if travel time increases > 10%
 * @see Requirement 3.3 - Show both route options when recalculated route differs
 * @see Requirement 3.4 - Re-evaluate risk index for new route
 */
class RouteRecalculationResult implements JsonSerializable
{
    public function __construct(
        public readonly RouteWithRisk $originalRoute,
        public readonly ?RouteWithRisk $newRoute,
        public readonly bool $routeChanged,
        public readonly bool $riskChanged,
        public readonly float $timeChangePercent,
        public readonly ?string $message = null,
    ) {}

    /**
     * Create from array data.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            originalRoute: $data['original_route'] instanceof RouteWithRisk
                ? $data['original_route']
                : RouteWithRisk::fromArray($data['original_route']),
            newRoute: isset($data['new_route'])
                ? ($data['new_route'] instanceof RouteWithRisk
                    ? $data['new_route']
                    : RouteWithRisk::fromArray($data['new_route']))
                : null,
            routeChanged: (bool) ($data['route_changed'] ?? $data['routeChanged'] ?? false),
            riskChanged: (bool) ($data['risk_changed'] ?? $data['riskChanged'] ?? false),
            timeChangePercent: (float) ($data['time_change_percent'] ?? $data['timeChangePercent'] ?? 0),
            message: $data['message'] ?? null,
        );
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'original_route' => $this->originalRoute->toArray(),
            'new_route' => $this->newRoute?->toArray(),
            'route_changed' => $this->routeChanged,
            'risk_changed' => $this->riskChanged,
            'time_change_percent' => $this->timeChangePercent,
            'message' => $this->message,
        ];
    }

    /**
     * JSON serialization.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Check if recalculation was triggered by significant time increase.
     */
    public function wasTriggeredByTimeIncrease(): bool
    {
        return $this->timeChangePercent > 10;
    }

    /**
     * Get the recommended route (new if changed, otherwise original).
     */
    public function getRecommendedRoute(): RouteWithRisk
    {
        return $this->newRoute ?? $this->originalRoute;
    }

    /**
     * Check if user should be notified about the change.
     */
    public function shouldNotifyUser(): bool
    {
        return $this->routeChanged || $this->riskChanged;
    }
}
