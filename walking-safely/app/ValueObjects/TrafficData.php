<?php

namespace App\ValueObjects;

use JsonSerializable;

class TrafficData implements JsonSerializable
{
    public function __construct(
        public readonly int $currentDuration,
        public readonly int $typicalDuration,
        public readonly float $delayRatio,
        public readonly string $trafficCondition,
        public readonly array $segments = [],
    ) {}

    public static function fromArray(array $data): self
    {
        $currentDuration = (int) ($data['current_duration'] ?? $data['currentDuration'] ?? 0);
        $typicalDuration = (int) ($data['typical_duration'] ?? $data['typicalDuration'] ?? $currentDuration);

        $delayRatio = $typicalDuration > 0
            ? ($currentDuration - $typicalDuration) / $typicalDuration
            : 0.0;

        return new self(
            currentDuration: $currentDuration,
            typicalDuration: $typicalDuration,
            delayRatio: (float) ($data['delay_ratio'] ?? $data['delayRatio'] ?? $delayRatio),
            trafficCondition: $data['traffic_condition'] ?? $data['trafficCondition'] ?? self::calculateCondition($delayRatio),
            segments: $data['segments'] ?? [],
        );
    }

    private static function calculateCondition(float $delayRatio): string
    {
        return match (true) {
            $delayRatio <= 0.1 => 'free',
            $delayRatio <= 0.25 => 'light',
            $delayRatio <= 0.5 => 'moderate',
            $delayRatio <= 1.0 => 'heavy',
            default => 'severe',
        };
    }

    public function hasSignificantDelay(float $threshold = 0.1): bool
    {
        return $this->delayRatio > $threshold;
    }

    public function toArray(): array
    {
        return [
            'current_duration' => $this->currentDuration,
            'typical_duration' => $this->typicalDuration,
            'delay_ratio' => $this->delayRatio,
            'traffic_condition' => $this->trafficCondition,
            'segments' => $this->segments,
        ];
    }

    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
