<?php

namespace App\ValueObjects;

use JsonSerializable;

class RouteOptions implements JsonSerializable
{
    public function __construct(
        public readonly bool $avoidTolls = false,
        public readonly bool $avoidHighways = false,
        public readonly bool $preferSafeRoute = false,
        public readonly ?string $departureTime = null,
        public readonly string $mode = 'driving',
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            avoidTolls: (bool) ($data['avoid_tolls'] ?? $data['avoidTolls'] ?? false),
            avoidHighways: (bool) ($data['avoid_highways'] ?? $data['avoidHighways'] ?? false),
            preferSafeRoute: (bool) ($data['prefer_safe_route'] ?? $data['preferSafeRoute'] ?? false),
            departureTime: $data['departure_time'] ?? $data['departureTime'] ?? null,
            mode: $data['mode'] ?? 'driving',
        );
    }

    public function toArray(): array
    {
        return [
            'avoid_tolls' => $this->avoidTolls,
            'avoid_highways' => $this->avoidHighways,
            'prefer_safe_route' => $this->preferSafeRoute,
            'departure_time' => $this->departureTime,
            'mode' => $this->mode,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
