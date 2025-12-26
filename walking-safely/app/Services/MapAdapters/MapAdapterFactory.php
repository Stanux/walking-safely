<?php

namespace App\Services\MapAdapters;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Factory for creating map adapter instances.
 *
 * @see Requirement 1.3 - Load configured map provider without API changes
 * @see Requirement 1.4 - Support provider swap via environment configuration
 * @see Requirement 1.5 - Automatic fallback to alternative provider
 */
class MapAdapterFactory
{
    /**
     * Supported providers.
     */
    private const SUPPORTED_PROVIDERS = ['google', 'here', 'mapbox', 'nominatim'];

    /**
     * Default fallback order.
     */
    private const DEFAULT_FALLBACK_ORDER = ['nominatim', 'google', 'here', 'mapbox'];

    private QuotaManager $quotaManager;

    /**
     * Cache of adapter instances.
     */
    private array $adapters = [];

    public function __construct(?QuotaManager $quotaManager = null)
    {
        $this->quotaManager = $quotaManager ?? new QuotaManager();
    }

    /**
     * Create an adapter for the specified provider.
     *
     * @param string $provider Provider name (google, here, mapbox, nominatim)
     * @return MapAdapterInterface
     * @throws InvalidArgumentException If provider is not supported
     */
    public function createAdapter(string $provider): MapAdapterInterface
    {
        $provider = strtolower($provider);

        if (!in_array($provider, self::SUPPORTED_PROVIDERS)) {
            throw new InvalidArgumentException(
                "Unsupported map provider: {$provider}. Supported providers: " .
                implode(', ', self::SUPPORTED_PROVIDERS)
            );
        }

        // Return cached instance if available
        if (isset($this->adapters[$provider])) {
            return $this->adapters[$provider];
        }

        $adapter = match ($provider) {
            'google' => new GoogleMapsAdapter($this->quotaManager),
            'here' => new HereMapsAdapter($this->quotaManager),
            'mapbox' => new MapboxAdapter($this->quotaManager),
            'nominatim' => new NominatimAdapter($this->quotaManager),
        };

        $this->adapters[$provider] = $adapter;

        return $adapter;
    }

    /**
     * Get the adapter for the configured primary provider.
     *
     * @return MapAdapterInterface
     */
    public function getConfiguredAdapter(): MapAdapterInterface
    {
        $provider = config('services.map_provider', 'google');

        return $this->createAdapter($provider);
    }

    /**
     * Get a fallback adapter when the primary provider fails.
     *
     * @param string|null $excludeProvider Provider to exclude from fallback options
     * @return MapAdapterInterface|null Fallback adapter or null if none available
     */
    public function getFallbackAdapter(?string $excludeProvider = null): ?MapAdapterInterface
    {
        $fallbackOrder = config('services.map_fallback_order', self::DEFAULT_FALLBACK_ORDER);

        foreach ($fallbackOrder as $provider) {
            if ($provider === $excludeProvider) {
                continue;
            }

            try {
                $adapter = $this->createAdapter($provider);

                if ($adapter->isAvailable()) {
                    Log::info("Using fallback map provider", [
                        'provider' => $provider,
                        'excluded' => $excludeProvider,
                    ]);

                    return $adapter;
                }
            } catch (\Throwable $e) {
                Log::warning("Fallback provider not available", [
                    'provider' => $provider,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * Get an adapter with automatic fallback on failure.
     *
     * This method returns a proxy that automatically falls back to alternative
     * providers when the primary provider fails.
     *
     * @return MapAdapterInterface
     */
    public function getAdapterWithFallback(): MapAdapterInterface
    {
        return new MapAdapterWithFallback($this);
    }

    /**
     * Get all available adapters.
     *
     * @return MapAdapterInterface[]
     */
    public function getAllAdapters(): array
    {
        $adapters = [];

        foreach (self::SUPPORTED_PROVIDERS as $provider) {
            try {
                $adapters[$provider] = $this->createAdapter($provider);
            } catch (\Throwable $e) {
                Log::warning("Failed to create adapter", [
                    'provider' => $provider,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $adapters;
    }

    /**
     * Check which providers are currently available.
     *
     * @return array<string, bool>
     */
    public function checkAvailability(): array
    {
        $availability = [];

        foreach (self::SUPPORTED_PROVIDERS as $provider) {
            try {
                $adapter = $this->createAdapter($provider);
                $availability[$provider] = $adapter->isAvailable();
            } catch (\Throwable $e) {
                $availability[$provider] = false;
            }
        }

        return $availability;
    }

    /**
     * Get supported provider names.
     *
     * @return string[]
     */
    public function getSupportedProviders(): array
    {
        return self::SUPPORTED_PROVIDERS;
    }

    /**
     * Get the quota manager instance.
     *
     * @return QuotaManager
     */
    public function getQuotaManager(): QuotaManager
    {
        return $this->quotaManager;
    }
}
