<?php

namespace App\Enums;

enum UserRole: string
{
    case USER = 'user';
    case MODERATOR = 'moderator';
    case ADMIN = 'admin';

    /**
     * Get all valid role values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Check if the role has moderator privileges.
     */
    public function hasModeratorPrivileges(): bool
    {
        return in_array($this, [self::MODERATOR, self::ADMIN]);
    }

    /**
     * Check if the role has admin privileges.
     */
    public function hasAdminPrivileges(): bool
    {
        return $this === self::ADMIN;
    }
}
