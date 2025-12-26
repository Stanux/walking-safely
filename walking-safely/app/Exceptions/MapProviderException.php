<?php

namespace App\Exceptions;

use Exception;
use Throwable;

/**
 * Exception thrown when a map provider operation fails.
 */
class MapProviderException extends Exception
{
    public function __construct(
        string $message,
        public readonly string $provider,
        public readonly ?string $errorCode = null,
        public readonly bool $isRetryable = true,
        int $code = 0,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Create exception for timeout errors.
     */
    public static function timeout(string $provider, int $timeoutSeconds): self
    {
        return new self(
            message: "Request to {$provider} timed out after {$timeoutSeconds} seconds",
            provider: $provider,
            errorCode: 'TIMEOUT',
            isRetryable: true
        );
    }

    /**
     * Create exception for rate limit errors.
     */
    public static function rateLimited(string $provider): self
    {
        return new self(
            message: "Rate limit exceeded for {$provider}",
            provider: $provider,
            errorCode: 'RATE_LIMITED',
            isRetryable: true
        );
    }

    /**
     * Create exception for authentication errors.
     */
    public static function authenticationFailed(string $provider): self
    {
        return new self(
            message: "Authentication failed for {$provider}. Check API key configuration.",
            provider: $provider,
            errorCode: 'AUTH_FAILED',
            isRetryable: false
        );
    }

    /**
     * Create exception for quota exceeded errors.
     */
    public static function quotaExceeded(string $provider): self
    {
        return new self(
            message: "API quota exceeded for {$provider}",
            provider: $provider,
            errorCode: 'QUOTA_EXCEEDED',
            isRetryable: false
        );
    }

    /**
     * Create exception for provider unavailable errors.
     */
    public static function unavailable(string $provider): self
    {
        return new self(
            message: "{$provider} is currently unavailable",
            provider: $provider,
            errorCode: 'UNAVAILABLE',
            isRetryable: true
        );
    }

    /**
     * Create exception for invalid response errors.
     */
    public static function invalidResponse(string $provider, string $details = ''): self
    {
        $message = "Invalid response from {$provider}";
        if ($details) {
            $message .= ": {$details}";
        }

        return new self(
            message: $message,
            provider: $provider,
            errorCode: 'INVALID_RESPONSE',
            isRetryable: true
        );
    }

    /**
     * Create exception for no route found errors.
     */
    public static function noRouteFound(string $provider): self
    {
        return new self(
            message: "No route found by {$provider}",
            provider: $provider,
            errorCode: 'NO_ROUTE',
            isRetryable: false
        );
    }

    /**
     * Create exception for geocoding not found errors.
     */
    public static function geocodeNotFound(string $provider, string $address): self
    {
        return new self(
            message: "No results found for address '{$address}' using {$provider}",
            provider: $provider,
            errorCode: 'GEOCODE_NOT_FOUND',
            isRetryable: false
        );
    }
}
