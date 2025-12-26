<?php

namespace App\Http\Resources;

use App\Models\ModerationQueue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for ModerationQueue.
 *
 * @see Requirement 14.1 - Moderation queue
 * @see Requirement 14.2 - Moderation audit
 */
class ModerationQueueResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var ModerationQueue
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
            'occurrence_id' => $this->resource->occurrence_id,
            'occurrence' => $this->when(
                $this->resource->relationLoaded('occurrence'),
                fn() => new OccurrenceResource($this->resource->occurrence)
            ),
            'reason' => $this->resource->reason?->value,
            'reason_label' => $this->resource->reason?->getLabel(),
            'status' => $this->resource->status?->value,
            'reported_by' => $this->resource->reported_by,
            'reporter' => $this->when(
                $this->resource->relationLoaded('reporter'),
                fn() => $this->resource->reporter ? new UserResource($this->resource->reporter) : null
            ),
            'moderated_by' => $this->resource->moderated_by,
            'moderator' => $this->when(
                $this->resource->relationLoaded('moderator'),
                fn() => $this->resource->moderator ? new UserResource($this->resource->moderator) : null
            ),
            'moderated_at' => $this->resource->moderated_at?->toIso8601String(),
            'notes' => $this->resource->notes,
            'detection_details' => $this->resource->detection_details,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
