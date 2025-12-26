<?php

namespace App\Enums;

enum ModerationReason: string
{
    case ANOMALY_DETECTED = 'anomaly_detected';
    case USER_REPORTED = 'user_reported';
    case ABUSE_PATTERN = 'abuse_pattern';
    case SUSPICIOUS_LOCATION = 'suspicious_location';
    case HIGH_FREQUENCY = 'high_frequency';
    case DUPLICATE_CONTENT = 'duplicate_content';

    /**
     * Get all valid reason values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get the priority level for this reason.
     * Higher values indicate higher priority.
     */
    public function getPriority(): int
    {
        return match ($this) {
            self::ABUSE_PATTERN => 10,
            self::HIGH_FREQUENCY => 8,
            self::ANOMALY_DETECTED => 6,
            self::SUSPICIOUS_LOCATION => 5,
            self::DUPLICATE_CONTENT => 4,
            self::USER_REPORTED => 3,
        };
    }

    /**
     * Get a human-readable description of the reason.
     */
    public function getDescription(): string
    {
        return match ($this) {
            self::ANOMALY_DETECTED => 'Anomaly detected by automated system',
            self::USER_REPORTED => 'Reported by another user',
            self::ABUSE_PATTERN => 'Abuse pattern detected from user',
            self::SUSPICIOUS_LOCATION => 'Suspicious location pattern',
            self::HIGH_FREQUENCY => 'High frequency of reports from user',
            self::DUPLICATE_CONTENT => 'Duplicate or similar content detected',
        };
    }
}
