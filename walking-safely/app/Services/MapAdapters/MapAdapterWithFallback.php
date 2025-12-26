<?php

namespace App\Services\MapAdapters;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;
use Illuminate\Support\Facades\Log;

/**
 * Map adapter decorator that provides automatic fallback to alternative providers.
 *
 * @see Requirement 1.5 - Automatic fallback when provider is unavailable
 */
class MapAdapterWithFallback implements MapAdapterInterface
{
    private MapAdapterFactory $factory;
    private ?MapAdapterInterface $currentAdapter = null;

    public function __construct(MapAdapterFactory $factory)
    {
        $this->factory = $factory;
    }

    /**
     * {@inheritdoc}
     */
    public function calculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options = null
    ): Route {
        return $this->executeWithFallback(
            fn(MapAdapterInterface $adapter) => $adapter->calculateRoute($origin, $destination, $options),
            'calculateRoute'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function calculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count = 3
    ): array {
        return $this->executeWithFallback(
            fn(MapAdapterInterface $adapter) => $adapter->calculateAlternativeRoutes($origin, $destination, $count),
            'calculateAlternativeRoutes'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function geocode(string $address): array {
        return $this->executeWithFallback(
            fn(MapAdapterInterface $adapter) => $adapter->geocode($address),
            'geocode'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function reverseGeocode(Coordinates $coordinates): Address {
        return $this->executeWithFallback(
            fn(MapAdapterInterface $adapter) => $adapter->reverseGeocode($coordinates),
            'reverseGeocode'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function getTrafficData(Route $route): TrafficData {
        return $this->executeWithFallback(
            fn(MapAdapterInterface $adapter) => $adapter->getTrafficData($route),
            'getTrafficData'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function getProviderName(): string
    {
        return $this->getCurrentAdapter()->getProviderName();
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        // Check if any provider is available
        foreach ($this->factory->getSupportedProviders() as $provider) {
            try {
                $adapter = $this->factory->createAdapter($provider);
                if ($adapter->isAvailable()) {
                    return true;
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        return false;
    }

    /**
     * Execute an operation with automatic fallback on failure.
     *
     * @param callable $operation The operation to execute
     * @param string $operationName Name of the operation for logging
     * @return mixed Result of the operation
     * @throws MapProviderException When all providers fail
     */
    private function executeWithFallback(callable $operation, string $operationName): mixed
    {
        $triedProviders = [];
        $lastException = null;

        // Try primary adapter first
        $adapter = $this->getCurrentAdapter();
        $triedProviders[] = $adapter->getProviderName();

        try {
            return $operation($adapter);
        } catch (MapProviderException $e) {
            $lastException = $e;

            // Don't fallback for non-retryable errors that aren't provider issues
            if (!$e->isRetryable && !in_array($e->errorCode, ['UNAVAILABLE', 'TIMEOUT', 'RATE_LIMITED'])) {
                throw $e;
            }

            Log::warning("Primary map provider failed, attempting fallback", [
                'provider' => $adapter->getProviderName(),
                'operation' => $operationName,
                'error' => $e->getMessage(),
            ]);
        }

        // Try fallback providers
        while ($fallbackAdapter = $this->factory->getFallbackAdapter($adapter->getProviderName())) {
            if (in_array($fallbackAdapter->getProviderName(), $triedProviders)) {
                break;
            }

            $triedProviders[] = $fallbackAdapter->getProviderName();
            $adapter = $fallbackAdapter;

            try {
                $result = $operation($adapter);

                // Update current adapter to the successful fallback
                $this->currentAdapter = $adapter;

                return $result;
            } catch (MapProviderException $e) {
                $lastException = $e;

                Log::warning("Fallback map provider failed", [
                    'provider' => $adapter->getProviderName(),
                    'operation' => $operationName,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // All providers failed
        Log::error("All map providers failed", [
            'operation' => $operationName,
            'tried_providers' => $triedProviders,
        ]);

        throw $lastException ?? MapProviderException::unavailable('all');
    }

    /**
     * Get the current adapter (primary or last successful fallback).
     */
    private function getCurrentAdapter(): MapAdapterInterface
    {
        if ($this->currentAdapter === null) {
            $this->currentAdapter = $this->factory->getConfiguredAdapter();
        }

        return $this->currentAdapter;
    }

    /**
     * Reset to use the primary configured adapter.
     */
    public function resetToPrimaryAdapter(): void
    {
        $this->currentAdapter = null;
    }

    /**
     * Get the factory instance.
     */
    public function getFactory(): MapAdapterFactory
    {
        return $this->factory;
    }
}
