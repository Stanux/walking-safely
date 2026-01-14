<?php

namespace App\Services\MapAdapters;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use App\Services\MapAdapters\Traits\WithRetry;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Abstract base class for map provider adapters.
 *
 * Provides common functionality including retry logic, caching, and quota management.
 */
abstract class AbstractMapAdapter implements MapAdapterInterface
{
    use WithRetry;

    protected QuotaManager $quotaManager;

    /**
     * Cache TTL for geocoding results in seconds (24 hours).
     */
    protected int $geocodeCacheTtl = 86400;

    /**
     * Cache TTL for route results in seconds (5 minutes).
     */
    protected int $routeCacheTtl = 300;

    /**
     * HTTP timeout in seconds.
     * Increased to 30s to support long-distance route calculations (e.g., 600km+)
     */
    protected int $httpTimeout = 30;

    public function __construct(?QuotaManager $quotaManager = null)
    {
        $this->quotaManager = $quotaManager ?? new QuotaManager();
    }

    /**
     * {@inheritdoc}
     */
    public function calculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options = null
    ): Route {
        $this->checkQuota('route');

        $cacheKey = $this->getRouteCacheKey($origin, $destination, $options);

        return Cache::remember($cacheKey, $this->routeCacheTtl, function () use ($origin, $destination, $options) {
            return $this->withRetry(
                fn() => $this->doCalculateRoute($origin, $destination, $options),
                'route calculation'
            );
        });
    }

    /**
     * {@inheritdoc}
     */
    public function calculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count = 3
    ): array {
        $this->checkQuota('route');

        return $this->withRetry(
            fn() => $this->doCalculateAlternativeRoutes($origin, $destination, $count),
            'alternative routes calculation'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function geocode(string $address): array {
        $this->checkQuota('geocode');

        $cacheKey = $this->getGeocodeCacheKey($address);

        return Cache::remember($cacheKey, $this->geocodeCacheTtl, function () use ($address) {
            return $this->withRetry(
                fn() => $this->doGeocode($address),
                'geocoding'
            );
        });
    }

    /**
     * {@inheritdoc}
     */
    public function reverseGeocode(Coordinates $coordinates): Address {
        $this->checkQuota('geocode');

        $cacheKey = $this->getReverseGeocodeCacheKey($coordinates);

        return Cache::remember($cacheKey, $this->geocodeCacheTtl, function () use ($coordinates) {
            return $this->withRetry(
                fn() => $this->doReverseGeocode($coordinates),
                'reverse geocoding'
            );
        });
    }

    /**
     * {@inheritdoc}
     */
    public function getTrafficData(Route $route): TrafficData {
        $this->checkQuota('traffic');

        return $this->withRetry(
            fn() => $this->doGetTrafficData($route),
            'traffic data retrieval'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool {
        try {
            return $this->doHealthCheck();
        } catch (\Throwable $e) {
            Log::warning("Map provider health check failed", [
                'provider' => $this->getProviderName(),
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check quota and throw exception if throttled and call not allowed.
     */
    protected function checkQuota(string $operation): void
    {
        if (!$this->quotaManager->shouldAllowCall($this->getProviderName())) {
            throw MapProviderException::rateLimited($this->getProviderName());
        }
    }

    /**
     * Record an API call for quota tracking.
     */
    protected function recordApiCall(string $operation, float $cost = 0.0): void
    {
        $this->quotaManager->recordCall($this->getProviderName(), $operation, $cost);
    }

    /**
     * Make an HTTP GET request.
     */
    protected function httpGet(string $url, array $query = []): array
    {
        $response = Http::timeout($this->httpTimeout)
            ->get($url, $query);

        if ($response->failed()) {
            $this->handleHttpError($response->status(), $response->body());
        }

        return $response->json() ?? [];
    }

    /**
     * Make an HTTP POST request.
     */
    protected function httpPost(string $url, array $data = []): array
    {
        $response = Http::timeout($this->httpTimeout)
            ->post($url, $data);

        if ($response->failed()) {
            $this->handleHttpError($response->status(), $response->body());
        }

        return $response->json() ?? [];
    }

    /**
     * Handle HTTP errors and throw appropriate exceptions.
     */
    protected function handleHttpError(int $status, string $body): void
    {
        $provider = $this->getProviderName();

        throw match ($status) {
            401, 403 => MapProviderException::authenticationFailed($provider),
            429 => MapProviderException::rateLimited($provider),
            500, 502, 503, 504 => MapProviderException::unavailable($provider),
            default => MapProviderException::invalidResponse($provider, "HTTP {$status}: {$body}"),
        };
    }

    /**
     * Generate cache key for route.
     */
    protected function getRouteCacheKey(Coordinates $origin, Coordinates $destination, ?RouteOptions $options): string
    {
        $optionsHash = $options ? md5(json_encode($options->toArray())) : 'default';
        return sprintf(
            'route_%s_%s_%s_%s_%s',
            $this->getProviderName(),
            $origin->latitude,
            $origin->longitude,
            $destination->latitude . '_' . $destination->longitude,
            $optionsHash
        );
    }

    /**
     * Generate cache key for geocoding.
     */
    protected function getGeocodeCacheKey(string $address): string
    {
        return sprintf(
            'geocode_%s_%s',
            $this->getProviderName(),
            md5(strtolower(trim($address)))
        );
    }

    /**
     * Generate cache key for reverse geocoding.
     */
    protected function getReverseGeocodeCacheKey(Coordinates $coordinates): string
    {
        return sprintf(
            'reverse_geocode_%s_%.6f_%.6f',
            $this->getProviderName(),
            $coordinates->latitude,
            $coordinates->longitude
        );
    }

    /**
     * Perform the actual route calculation (provider-specific).
     */
    abstract protected function doCalculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options
    ): Route;

    /**
     * Perform the actual alternative routes calculation (provider-specific).
     */
    abstract protected function doCalculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count
    ): array;

    /**
     * Perform the actual geocoding (provider-specific).
     */
    abstract protected function doGeocode(string $address): array;

    /**
     * Perform the actual reverse geocoding (provider-specific).
     */
    abstract protected function doReverseGeocode(Coordinates $coordinates): Address;

    /**
     * Perform the actual traffic data retrieval (provider-specific).
     */
    abstract protected function doGetTrafficData(Route $route): TrafficData;

    /**
     * Perform health check (provider-specific).
     */
    abstract protected function doHealthCheck(): bool;
}
