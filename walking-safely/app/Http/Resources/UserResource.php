<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for User.
 */
class UserResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var User
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
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'role' => $this->resource->role?->value,
            'locale' => $this->resource->locale,
            'email_verified_at' => $this->resource->email_verified_at?->toIso8601String(),
            'two_factor_enabled' => $this->resource->two_factor_enabled,
            'location_permission_granted' => $this->resource->location_permission_granted,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
