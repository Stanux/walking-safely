<?php

namespace App\Enums;

enum OccurrenceSeverity: string
{
    case LOW = 'low';
    case MEDIUM = 'medium';
    case HIGH = 'high';
    case CRITICAL = 'critical';

    /**
     * Get all valid severity values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get the weight factor for risk calculation.
     */
    public function getWeight(): float
    {
        return match ($this) {
            self::LOW => 0.25,
            self::MEDIUM => 0.5,
            self::HIGH => 0.75,
            self::CRITICAL => 1.0,
        };
    }
}
