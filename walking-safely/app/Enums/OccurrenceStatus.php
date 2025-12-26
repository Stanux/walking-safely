<?php

namespace App\Enums;

enum OccurrenceStatus: string
{
    case ACTIVE = 'active';
    case EXPIRED = 'expired';
    case REJECTED = 'rejected';
    case MERGED = 'merged';

    /**
     * Get all valid status values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Check if the occurrence is visible to users.
     */
    public function isVisible(): bool
    {
        return $this === self::ACTIVE;
    }
}
