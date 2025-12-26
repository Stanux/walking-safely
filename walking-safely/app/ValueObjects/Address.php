<?php

namespace App\ValueObjects;

use JsonSerializable;

class Address implements JsonSerializable
{
    public function __construct(
        public readonly string $formattedAddress,
        public readonly Coordinates $coordinates,
        public readonly ?string $street = null,
        public readonly ?string $number = null,
        public readonly ?string $neighborhood = null,
        public readonly ?string $city = null,
        public readonly ?string $state = null,
        public readonly ?string $country = null,
        public readonly ?string $postalCode = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            formattedAddress: $data['formatted_address'] ?? $data['formattedAddress'] ?? '',
            coordinates: isset($data['coordinates'])
                ? ($data['coordinates'] instanceof Coordinates
                    ? $data['coordinates']
                    : Coordinates::fromArray($data['coordinates']))
                : new Coordinates(
                    (float) ($data['latitude'] ?? $data['lat'] ?? 0),
                    (float) ($data['longitude'] ?? $data['lng'] ?? $data['lon'] ?? 0)
                ),
            street: $data['street'] ?? null,
            number: $data['number'] ?? null,
            neighborhood: $data['neighborhood'] ?? null,
            city: $data['city'] ?? null,
            state: $data['state'] ?? null,
            country: $data['country'] ?? null,
            postalCode: $data['postal_code'] ?? $data['postalCode'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'formatted_address' => $this->formattedAddress,
            'coordinates' => $this->coordinates->toArray(),
            'street' => $this->street,
            'number' => $this->number,
            'neighborhood' => $this->neighborhood,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postal_code' => $this->postalCode,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
