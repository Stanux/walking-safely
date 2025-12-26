<?php

namespace App\Enums;

enum OccurrenceSource: string
{
    case COLLABORATIVE = 'collaborative';
    case OFFICIAL = 'official';

    /**
     * Get all valid source values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get the initial confidence score for this source type.
     * Official sources get score 5, collaborative sources get score 2.
     */
    public function getInitialConfidenceScore(): int
    {
        return match ($this) {
            self::OFFICIAL => 5,
            self::COLLABORATIVE => 2,
        };
    }
}
