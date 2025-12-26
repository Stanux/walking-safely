<?php

namespace App\Http\Resources;

use App\ValueObjects\Address;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * API Resource Collection for Addresses.
 *
 * @see Requirement 9.1 - Return up to 5 results
 */
class AddressCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @return array<int|string, mixed>
     */
    public function toArray(Request $request): array
    {
        return $this->collection->map(function ($address) use ($request) {
            if ($address instanceof Address) {
                return (new AddressResource($address))->toArray($request);
            }
            return $address;
        })->all();
    }
}
