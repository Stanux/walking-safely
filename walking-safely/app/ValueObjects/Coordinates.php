<?php

namespace App\ValueObjects;

use InvalidArgumentException;
use JsonSerializable;
use MatanYadaev\EloquentSpatial\Objects\Point;

class Coordinates implements JsonSerializable
{
    public readonly float $latitude;
    public readonly float $longitude;

    public function __construct(float $latitude, float $longitude)
    {
        $this->validateLatitude($latitude);
        $this->validateLongitude($longitude);

        $this->latitude = $latitude;
        $this->longitude = $longitude;
    }

    /**
     * Validate latitude is within valid range (-90 to 90).
     */
    private function validateLatitude(float $latitude): void
    {
        if ($latitude < -90 || $latitude > 90) {
            throw new InvalidArgumentException(
                "Latitude must be between -90 and 90. Got: {$latitude}"
            );
        }
    }

    /**
     * Validate longitude is within valid range (-180 to 180).
     */
    private function validateLongitude(float $longitude): void
    {
        if ($longitude < -180 || $longitude > 180) {
            throw new InvalidArgumentException(
                "Longitude must be between -180 and 180. Got: {$longitude}"
            );
        }
    }

    /**
     * Convert to PostGIS Point with SRID 4326 (WGS84).
     */
    public function toPoint(): Point
    {
        return new Point($this->latitude, $this->longitude, 4326);
    }

    /**
     * Create from PostGIS Point.
     */
    public static function fromPoint(Point $point): self
    {
        return new self($point->latitude, $point->longitude);
    }

    /**
     * Create from array.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            (float) ($data['latitude'] ?? $data['lat'] ?? 0),
            (float) ($data['longitude'] ?? $data['lng'] ?? $data['lon'] ?? 0)
        );
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }

    /**
     * Calculate distance to another coordinate in meters using Haversine formula.
     */
    public function distanceTo(Coordinates $other): float
    {
        $earthRadius = 6371000; // meters

        $latFrom = deg2rad($this->latitude);
        $lonFrom = deg2rad($this->longitude);
        $latTo = deg2rad($other->latitude);
        $lonTo = deg2rad($other->longitude);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $a = sin($latDelta / 2) ** 2 +
            cos($latFrom) * cos($latTo) * sin($lonDelta / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Check if coordinates are within a given distance (in meters) of another coordinate.
     */
    public function isWithinDistance(Coordinates $other, float $maxDistance): bool
    {
        return $this->distanceTo($other) <= $maxDistance;
    }

    /**
     * JSON serialization.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Check equality with another Coordinates object.
     */
    public function equals(Coordinates $other): bool
    {
        return $this->latitude === $other->latitude
            && $this->longitude === $other->longitude;
    }
}
