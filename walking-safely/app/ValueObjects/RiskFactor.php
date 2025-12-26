<?php

namespace App\ValueObjects;

use InvalidArgumentException;
use JsonSerializable;

class RiskFactor implements JsonSerializable
{
    public const TYPE_FREQUENCY = 'frequency';
    public const TYPE_RECENCY = 'recency';
    public const TYPE_SEVERITY = 'severity';
    public const TYPE_CONFIDENCE = 'confidence';

    public const VALID_TYPES = [
        self::TYPE_FREQUENCY,
        self::TYPE_RECENCY,
        self::TYPE_SEVERITY,
        self::TYPE_CONFIDENCE,
    ];

    public readonly string $type;
    public readonly float $weight;
    public readonly float $contribution;

    public function __construct(string $type, float $weight, float $contribution)
    {
        $this->validateType($type);
        $this->validateWeight($weight);
        $this->validateContribution($contribution);

        $this->type = $type;
        $this->weight = $weight;
        $this->contribution = $contribution;
    }

    /**
     * Validate the factor type.
     */
    private function validateType(string $type): void
    {
        if (!in_array($type, self::VALID_TYPES, true)) {
            throw new InvalidArgumentException(
                "Invalid risk factor type: {$type}. Valid types: " . implode(', ', self::VALID_TYPES)
            );
        }
    }

    /**
     * Validate weight is between 0 and 1.
     */
    private function validateWeight(float $weight): void
    {
        if ($weight < 0 || $weight > 1) {
            throw new InvalidArgumentException(
                "Weight must be between 0 and 1. Got: {$weight}"
            );
        }
    }

    /**
     * Validate contribution is between 0 and 100.
     */
    private function validateContribution(float $contribution): void
    {
        if ($contribution < 0 || $contribution > 100) {
            throw new InvalidArgumentException(
                "Contribution must be between 0 and 100. Got: {$contribution}"
            );
        }
    }

    /**
     * Calculate the weighted contribution.
     */
    public function getWeightedContribution(): float
    {
        return $this->weight * $this->contribution;
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'weight' => $this->weight,
            'contribution' => $this->contribution,
        ];
    }

    /**
     * Create from array.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            $data['type'],
            (float) $data['weight'],
            (float) $data['contribution']
        );
    }

    /**
     * JSON serialization.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Check equality with another RiskFactor object.
     */
    public function equals(RiskFactor $other): bool
    {
        return $this->type === $other->type
            && $this->weight === $other->weight
            && $this->contribution === $other->contribution;
    }
}
