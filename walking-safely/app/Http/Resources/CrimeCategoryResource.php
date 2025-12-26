<?php

namespace App\Http\Resources;

use App\Models\CrimeCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for CrimeCategory.
 *
 * @see Requirement 13.1 - Hierarchical taxonomy
 * @see Requirement 13.2 - Taxonomy versioning
 */
class CrimeCategoryResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var CrimeCategory
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
            'name' => $this->resource->name,
            'localized_name' => $this->resource->getLocalizedName($locale),
            'parent_id' => $this->resource->parent_id,
            'weight' => $this->resource->weight,
            'version' => $this->resource->version,
            'children' => $this->when(
                $this->resource->relationLoaded('children'),
                fn() => CrimeCategoryResource::collection($this->resource->children)
            ),
            'translations' => $this->when(
                $this->resource->relationLoaded('translations'),
                fn() => $this->resource->translations->map(fn($t) => [
                    'locale' => $t->locale,
                    'name' => $t->name,
                ])
            ),
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
