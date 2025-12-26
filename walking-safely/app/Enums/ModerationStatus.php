<?php

namespace App\Enums;

enum ModerationStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';

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
     * Check if the status is pending.
     */
    public function isPending(): bool
    {
        return $this === self::PENDING;
    }

    /**
     * Check if the status has been resolved.
     */
    public function isResolved(): bool
    {
        return $this === self::APPROVED || $this === self::REJECTED;
    }
}
