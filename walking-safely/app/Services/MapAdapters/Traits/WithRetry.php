<?php

namespace App\Services\MapAdapters\Traits;

use App\Exceptions\MapProviderException;
use Closure;
use Throwable;

/**
 * Trait for implementing retry with exponential backoff.
 *
 * @see Requirement 17.3 - Retry up to 3 times with exponential backoff before returning error
 */
trait WithRetry
{
    /**
     * Maximum number of retry attempts.
     */
    protected int $maxRetries = 3;

    /**
     * Base delay in milliseconds for exponential backoff.
     */
    protected int $baseDelayMs = 1000;

    /**
     * Maximum delay in milliseconds.
     */
    protected int $maxDelayMs = 8000;

    /**
     * Execute a callback with retry logic and exponential backoff.
     *
     * @param Closure $callback The operation to execute
     * @param string $operation Description of the operation for error messages
     * @return mixed The result of the callback
     * @throws MapProviderException When all retries are exhausted
     */
    protected function withRetry(Closure $callback, string $operation = 'operation'): mixed
    {
        $lastException = null;
        $attempt = 0;

        while ($attempt < $this->maxRetries) {
            try {
                return $callback();
            } catch (MapProviderException $e) {
                $lastException = $e;

                // Don't retry non-retryable errors
                if (!$e->isRetryable) {
                    throw $e;
                }

                $attempt++;

                if ($attempt < $this->maxRetries) {
                    $this->sleep($this->calculateDelay($attempt));
                }
            } catch (Throwable $e) {
                $lastException = new MapProviderException(
                    message: "Unexpected error during {$operation}: " . $e->getMessage(),
                    provider: $this->getProviderName(),
                    errorCode: 'UNEXPECTED_ERROR',
                    isRetryable: true,
                    previous: $e
                );

                $attempt++;

                if ($attempt < $this->maxRetries) {
                    $this->sleep($this->calculateDelay($attempt));
                }
            }
        }

        throw $lastException ?? new MapProviderException(
            message: "Failed to complete {$operation} after {$this->maxRetries} attempts",
            provider: $this->getProviderName(),
            errorCode: 'MAX_RETRIES_EXCEEDED',
            isRetryable: false
        );
    }

    /**
     * Calculate delay for exponential backoff.
     *
     * Delay formula: min(baseDelay * 2^(attempt-1), maxDelay)
     * With jitter: delay * (0.5 + random(0, 0.5))
     *
     * @param int $attempt Current attempt number (1-based)
     * @return int Delay in milliseconds
     */
    protected function calculateDelay(int $attempt): int
    {
        // Exponential backoff: 1s, 2s, 4s
        $delay = $this->baseDelayMs * (2 ** ($attempt - 1));

        // Cap at maximum delay
        $delay = min($delay, $this->maxDelayMs);

        // Add jitter (50-100% of calculated delay)
        $jitter = $delay * (0.5 + (mt_rand(0, 50) / 100));

        return (int) $jitter;
    }

    /**
     * Sleep for the specified number of milliseconds.
     *
     * @param int $milliseconds Time to sleep
     */
    protected function sleep(int $milliseconds): void
    {
        usleep($milliseconds * 1000);
    }

    /**
     * Set the maximum number of retries.
     *
     * @param int $maxRetries Maximum retry attempts
     * @return static
     */
    public function setMaxRetries(int $maxRetries): static
    {
        $this->maxRetries = max(1, $maxRetries);
        return $this;
    }

    /**
     * Set the base delay for exponential backoff.
     *
     * @param int $baseDelayMs Base delay in milliseconds
     * @return static
     */
    public function setBaseDelay(int $baseDelayMs): static
    {
        $this->baseDelayMs = max(100, $baseDelayMs);
        return $this;
    }

    /**
     * Get the provider name (must be implemented by using class).
     *
     * @return string
     */
    abstract public function getProviderName(): string;
}
