<?php

namespace App\Http\Resources;

use App\Models\AlertPreference;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for AlertPreference.
 *
 * @see Requirement 6.3 - Alert preferences by occurrence type
 * @see Requirement 6.5 - Time-based alert preferences
 */
class AlertPreferenceResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var AlertPreference
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
            'id' => $this->resource->id,
            'user_id' => $this->resource->user_id,
            'alerts_enabled' => $this->resource->alerts_enabled,
            'enabled_crime_types' => $this->resource->enabled_crime_types ?? [],
            'time_restrictions' => [
                'active_hours_start' => $this->resource->active_hours_start,
                'active_hours_end' => $this->resource->active_hours_end,
                'active_days' => $this->resource->active_days ?? [],
                'has_time_restrictions' => $this->hasTimeRestrictions(),
            ],
            'is_currently_active' => $this->resource->isActiveAtCurrentTime(),
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Check if there are any time restrictions configured.
     */
    private function hasTimeRestrictions(): bool
    {
        return $this->resource->active_hours_start !== null
            || $this->resource->active_hours_end !== null
            || !empty($this->resource->active_days);
    }
}
