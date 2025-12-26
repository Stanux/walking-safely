<?php

namespace App\Http\Resources;

use App\Models\Occurrence;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Occurrence.
 *
 * @see Requirement 7.1 - Return occurrence with timestamp, GPS coordinates, crime type, severity
 */
class OccurrenceResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var Occurrence
     */
    public $resource;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $locale = $request->getPreferredLanguage() ?? app()->getLocale();

        return [
            'id' => $this->resource->id,
            'timestamp' => $this->resource->timestamp?->toIso8601String(),
            'location' => $this->resource->location ? [
                'latitude' => $this->resource->location->latitude,
                'longitude' => $this->resource->location->longitude,
            ] : null,
            'crime_type' => [
                'id' => $this->resource->crime_type_id,
                'name' => $this->resource->crimeType?->getLocalizedName($locale),
            ],
            'severity' => [
                'value' => $this->resource->severity?->value,
                'label' => $this->getSeverityLabel($this->resource->severity?->value),
            ],
            'confidence_score' => $this->resource->confidence_score,
            'source' => $this->resource->source?->value,
            'status' => $this->resource->status?->value,
            'region_id' => $this->resource->region_id,
            'expires_at' => $this->resource->expires_at?->toIso8601String(),
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Get localized severity label.
     */
    private function getSeverityLabel(?string $severity): ?string
    {
        if (!$severity) {
            return null;
        }

        return __("messages.severity.{$severity}");
    }
}
