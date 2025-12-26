<?php

namespace App\Http\Resources;

use App\ValueObjects\RouteRecalculationResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for RouteRecalculationResult.
 *
 * @see Requirement 3.1 - Recalculate route during active navigation
 * @see Requirement 3.3 - Show both route options when recalculated
 * @see Requirement 3.5 - Inform user if risk level changes
 */
class RouteRecalculationResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var RouteRecalculationResult
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'original_route' => new RouteWithRiskResource($this->resource->originalRoute),
            'new_route' => $this->resource->newRoute
                ? new RouteWithRiskResource($this->resource->newRoute)
                : null,
            'route_changed' => $this->resource->routeChanged,
            'risk_changed' => $this->resource->riskChanged,
            'time_change_percent' => round($this->resource->timeChangePercent, 1),
            'message' => $this->resource->message,
            'should_notify_user' => $this->resource->shouldNotifyUser(),
            'recommended_route' => new RouteWithRiskResource($this->resource->getRecommendedRoute()),
        ];
    }
}
