<?php

namespace App\Services;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Service for geocoding operations with cache fallback support.
 *
 * @see Requirement 9.1 - Return up to 5 results in up to 2 seconds
 * @see Requirement 9.3 - Fallback to local cache when provider is unavailable
 * @see Requirement 17.5 - Cache geocoding responses to reduce provider calls
 */
class GeocodingService
{
    /**
     * Maximum number of geocoding results to return.
     */
    public const MAX_RESULTS = 5;

    /**
     * Cache TTL for geocoding results in seconds (24 hours).
     */
    private const CACHE_TTL = 86400;

    /**
     * Cache TTL for fallback results in seconds (7 days).
     * Used when provider is unavailable.
     */
    private const FALLBACK_CACHE_TTL = 604800;

    /**
     * Cache key prefix for geocoding results.
     */
    private const CACHE_PREFIX = 'geocode_';

    /**
     * Cache key prefix for reverse geocoding results.
     */
    private const REVERSE_CACHE_PREFIX = 'reverse_geocode_';

    /**
     * Cache key prefix for fallback storage.
     */
    private const FALLBACK_PREFIX = 'geocode_fallback_';

    public function __construct(
        private MapAdapterInterface $mapAdapter
    ) {}

    /**
     * Geocode an address string to coordinates.
     *
     * @param string $address The address to geocode
     * @return Address[] Array of matching addresses (max 5 results)
     * @throws MapProviderException When geocoding fails and no cache is available
     */
    public function geocode(string $address): array
    {
        $normalizedAddress = $this->normalizeAddress($address);
        $cacheKey = $this->getGeocodeCacheKey($normalizedAddress);
        $fallbackKey = $this->getFallbackCacheKey($normalizedAddress);

        // Try to get from primary cache first
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            Log::debug('Geocoding cache hit', ['address' => $address]);
            return $this->deserializeAddresses($cached);
        }

        // Try to call the provider
        try {
            $results = $this->mapAdapter->geocode($address);

            // Limit results to MAX_RESULTS
            $results = array_slice($results, 0, self::MAX_RESULTS);

            // Cache the results
            $serialized = $this->serializeAddresses($results);
            Cache::put($cacheKey, $serialized, self::CACHE_TTL);

            // Also store in fallback cache with longer TTL
            Cache::put($fallbackKey, $serialized, self::FALLBACK_CACHE_TTL);

            Log::debug('Geocoding provider success', [
                'address' => $address,
                'results_count' => count($results),
            ]);

            return $results;
        } catch (MapProviderException $e) {
            Log::warning('Geocoding provider failed, attempting cache fallback', [
                'address' => $address,
                'error' => $e->getMessage(),
            ]);

            // Try fallback cache
            $fallback = Cache::get($fallbackKey);
            if ($fallback !== null) {
                Log::info('Geocoding fallback cache hit', ['address' => $address]);
                return $this->deserializeAddresses($fallback);
            }

            // No cache available, re-throw the exception
            throw $e;
        }
    }

    /**
     * Reverse geocode coordinates to an address.
     *
     * @param Coordinates $coordinates The coordinates to reverse geocode
     * @return Address The address at the given coordinates
     * @throws MapProviderException When reverse geocoding fails and no cache is available
     */
    public function reverseGeocode(Coordinates $coordinates): Address
    {
        $cacheKey = $this->getReverseGeocodeCacheKey($coordinates);
        $fallbackKey = $this->getReverseFallbackCacheKey($coordinates);

        // Try to get from primary cache first
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            Log::debug('Reverse geocoding cache hit', [
                'lat' => $coordinates->latitude,
                'lng' => $coordinates->longitude,
            ]);
            return Address::fromArray($cached);
        }

        // Try to call the provider
        try {
            $result = $this->mapAdapter->reverseGeocode($coordinates);

            // Cache the result
            $serialized = $result->toArray();
            Cache::put($cacheKey, $serialized, self::CACHE_TTL);

            // Also store in fallback cache with longer TTL
            Cache::put($fallbackKey, $serialized, self::FALLBACK_CACHE_TTL);

            Log::debug('Reverse geocoding provider success', [
                'lat' => $coordinates->latitude,
                'lng' => $coordinates->longitude,
            ]);

            return $result;
        } catch (MapProviderException $e) {
            Log::warning('Reverse geocoding provider failed, attempting cache fallback', [
                'lat' => $coordinates->latitude,
                'lng' => $coordinates->longitude,
                'error' => $e->getMessage(),
            ]);

            // Try fallback cache
            $fallback = Cache::get($fallbackKey);
            if ($fallback !== null) {
                Log::info('Reverse geocoding fallback cache hit', [
                    'lat' => $coordinates->latitude,
                    'lng' => $coordinates->longitude,
                ]);
                return Address::fromArray($fallback);
            }

            // No cache available, re-throw the exception
            throw $e;
        }
    }

    /**
     * Search for addresses with fuzzy matching in cache.
     * Useful when provider is unavailable.
     *
     * @param string $query Search query
     * @return Address[] Array of matching addresses from cache
     */
    public function searchCachedAddresses(string $query): array
    {
        // This is a simplified implementation
        // In production, you might want to use a more sophisticated search
        $normalizedQuery = $this->normalizeAddress($query);
        $cacheKey = $this->getGeocodeCacheKey($normalizedQuery);
        $fallbackKey = $this->getFallbackCacheKey($normalizedQuery);

        $cached = Cache::get($cacheKey) ?? Cache::get($fallbackKey);

        if ($cached !== null) {
            return $this->deserializeAddresses($cached);
        }

        return [];
    }

    /**
     * Warm up the cache with frequently used addresses.
     *
     * @param array $addresses Array of address strings to cache
     */
    public function warmUpCache(array $addresses): void
    {
        foreach ($addresses as $address) {
            try {
                $this->geocode($address);
            } catch (MapProviderException $e) {
                Log::warning('Failed to warm up cache for address', [
                    'address' => $address,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Clear geocoding cache for a specific address.
     *
     * @param string $address The address to clear from cache
     */
    public function clearCache(string $address): void
    {
        $normalizedAddress = $this->normalizeAddress($address);
        $cacheKey = $this->getGeocodeCacheKey($normalizedAddress);
        $fallbackKey = $this->getFallbackCacheKey($normalizedAddress);

        Cache::forget($cacheKey);
        Cache::forget($fallbackKey);
    }

    /**
     * Normalize an address string for consistent cache keys.
     */
    private function normalizeAddress(string $address): string
    {
        return mb_strtolower(trim($address));
    }

    /**
     * Generate cache key for geocoding.
     */
    private function getGeocodeCacheKey(string $normalizedAddress): string
    {
        return self::CACHE_PREFIX . md5($normalizedAddress);
    }

    /**
     * Generate fallback cache key for geocoding.
     */
    private function getFallbackCacheKey(string $normalizedAddress): string
    {
        return self::FALLBACK_PREFIX . md5($normalizedAddress);
    }

    /**
     * Generate cache key for reverse geocoding.
     */
    private function getReverseGeocodeCacheKey(Coordinates $coordinates): string
    {
        return sprintf(
            '%s%.6f_%.6f',
            self::REVERSE_CACHE_PREFIX,
            $coordinates->latitude,
            $coordinates->longitude
        );
    }

    /**
     * Generate fallback cache key for reverse geocoding.
     */
    private function getReverseFallbackCacheKey(Coordinates $coordinates): string
    {
        return sprintf(
            '%s%.6f_%.6f',
            self::FALLBACK_PREFIX . 'reverse_',
            $coordinates->latitude,
            $coordinates->longitude
        );
    }

    /**
     * Serialize addresses for cache storage.
     *
     * @param Address[] $addresses
     * @return array
     */
    private function serializeAddresses(array $addresses): array
    {
        return array_map(fn(Address $address) => $address->toArray(), $addresses);
    }

    /**
     * Deserialize addresses from cache storage.
     *
     * @param array $data
     * @return Address[]
     */
    private function deserializeAddresses(array $data): array
    {
        return array_map(fn(array $item) => Address::fromArray($item), $data);
    }
}
