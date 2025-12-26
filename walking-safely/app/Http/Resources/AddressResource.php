<?php

namespace App\Http\Resources;

use App\ValueObjects\Address;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Address.
 *
 * @see Requirement 9.2 - Show address, city, and geographic coordinates
 */
class AddressResource extends JsonResource
{
    /**
     * The resource instance.
     *
     * @var Address
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
            'formatted_address' => $this->resource->formattedAddress,
            'coordinates' => [
                'latitude' => $this->resource->coordinates->latitude,
                'longitude' => $this->resource->coordinates->longitude,
            ],
            'street' => $this->resource->street,
            'number' => $this->resource->number,
            'neighborhood' => $this->resource->neighborhood,
            'city' => $this->resource->city,
            'state' => $this->resource->state,
            'country' => $this->resource->country,
            'postal_code' => $this->resource->postalCode,
        ];
    }
}
