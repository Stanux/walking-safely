<?php

namespace App\Http\Resources;

use App\Models\Translation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Translation.
 *
 * @see Requirement 22.3 - Translation management
 * @see Requirement 22.4 - Translation versioning
 */
class TranslationResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var Translation
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
            'key' => $this->resource->key,
            'locale' => $this->resource->locale,
            'value' => $this->resource->value,
            'version' => $this->resource->version,
            'updated_by' => $this->resource->updated_by,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
