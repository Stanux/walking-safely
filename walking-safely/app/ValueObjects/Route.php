<?php

namespace App\ValueObjects;

use JsonSerializable;

class Route implements JsonSerializable
{
    public function __construct(
        public readonly string $id,
        public readonly Coordinates $origin,
        public readonly Coordinates $destination,
        public readonly array $waypoints,
        public readonly float $distance,
        public readonly int $duration,
        public readonly string $polyline,
        public readonly string $provider,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'] ?? uniqid('route_'),
            origin: $data['origin'] instanceof Coordinates
                ? $data['origin']
                : Coordinates::fromArray($data['origin']),
            destination: $data['destination'] instanceof Coordinates
                ? $data['destination']
                : Coordinates::fromArray($data['destination']),
            waypoints: array_map(
                fn($wp) => $wp instanceof Coordinates ? $wp : Coordinates::fromArray($wp),
                $data['waypoints'] ?? []
            ),
            distance: (float) ($data['distance'] ?? 0),
            duration: (int) ($data['duration'] ?? 0),
            polyline: $data['polyline'] ?? '',
            provider: $data['provider'] ?? 'unknown',
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'origin' => $this->origin->toArray(),
            'destination' => $this->destination->toArray(),
            'waypoints' => array_map(fn(Coordinates $wp) => $wp->toArray(), $this->waypoints),
            'distance' => $this->distance,
            'duration' => $this->duration,
            'polyline' => $this->polyline,
            'provider' => $this->provider,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
