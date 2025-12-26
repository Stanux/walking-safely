<?php

namespace App\Services\MapAdapters;

use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;

/**
 * Google Maps API adapter.
 *
 * @see Requirement 1.1 - Backend must implement Map Adapter for Google Maps
 * @see Requirement 17.1 - Authenticate with API Key
 */
class GoogleMapsAdapter extends AbstractMapAdapter
{
    private const PROVIDER_NAME = 'google';

    private const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
    private const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

    private string $apiKey;

    public function __construct(?QuotaManager $quotaManager = null)
    {
        parent::__construct($quotaManager);
        $this->apiKey = config('services.google_maps.api_key', '');
    }

    /**
     * {@inheritdoc}
     */
    public function getProviderName(): string
    {
        return self::PROVIDER_NAME;
    }

    /**
     * {@inheritdoc}
     */
    protected function doCalculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options
    ): Route {
        $params = [
            'origin' => "{$origin->latitude},{$origin->longitude}",
            'destination' => "{$destination->latitude},{$destination->longitude}",
            'key' => $this->apiKey,
            'departure_time' => 'now',
        ];

        if ($options) {
            $avoid = [];
            if ($options->avoidTolls) {
                $avoid[] = 'tolls';
            }
            if ($options->avoidHighways) {
                $avoid[] = 'highways';
            }
            if (!empty($avoid)) {
                $params['avoid'] = implode('|', $avoid);
            }

            if ($options->mode) {
                $params['mode'] = $options->mode;
            }

            if ($options->departureTime) {
                $params['departure_time'] = $options->departureTime;
            }
        }

        $response = $this->httpGet(self::DIRECTIONS_API_URL, $params);
        $this->recordApiCall('route', 0.005); // Estimated cost per request

        $this->validateDirectionsResponse($response);

        return $this->parseRoute($response['routes'][0], $origin, $destination);
    }

    /**
     * {@inheritdoc}
     */
    protected function doCalculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count
    ): array {
        $params = [
            'origin' => "{$origin->latitude},{$origin->longitude}",
            'destination' => "{$destination->latitude},{$destination->longitude}",
            'key' => $this->apiKey,
            'alternatives' => 'true',
            'departure_time' => 'now',
        ];

        $response = $this->httpGet(self::DIRECTIONS_API_URL, $params);
        $this->recordApiCall('route', 0.005);

        $this->validateDirectionsResponse($response);

        $routes = [];
        $routeCount = min($count, count($response['routes']));

        for ($i = 0; $i < $routeCount; $i++) {
            $routes[] = $this->parseRoute($response['routes'][$i], $origin, $destination);
        }

        return $routes;
    }

    /**
     * {@inheritdoc}
     */
    protected function doGeocode(string $address): array {
        $params = [
            'address' => $address,
            'key' => $this->apiKey,
            'region' => 'br', // Bias results to Brazil
            'language' => 'pt-BR',
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);
        $this->recordApiCall('geocode', 0.005);

        if (($response['status'] ?? '') === 'ZERO_RESULTS') {
            return [];
        }

        $this->validateGeocodingResponse($response);

        $addresses = [];
        $results = array_slice($response['results'] ?? [], 0, 5); // Max 5 results per Requirement 9.1

        foreach ($results as $result) {
            $addresses[] = $this->parseAddress($result);
        }

        return $addresses;
    }

    /**
     * {@inheritdoc}
     */
    protected function doReverseGeocode(Coordinates $coordinates): Address {
        $params = [
            'latlng' => "{$coordinates->latitude},{$coordinates->longitude}",
            'key' => $this->apiKey,
            'language' => 'pt-BR',
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);
        $this->recordApiCall('geocode', 0.005);

        $this->validateGeocodingResponse($response);

        if (empty($response['results'])) {
            throw MapProviderException::geocodeNotFound(
                self::PROVIDER_NAME,
                "{$coordinates->latitude},{$coordinates->longitude}"
            );
        }

        return $this->parseAddress($response['results'][0]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doGetTrafficData(Route $route): TrafficData {
        // Google provides traffic data in the directions response
        // We need to recalculate the route with traffic info
        $params = [
            'origin' => "{$route->origin->latitude},{$route->origin->longitude}",
            'destination' => "{$route->destination->latitude},{$route->destination->longitude}",
            'key' => $this->apiKey,
            'departure_time' => 'now',
        ];

        $response = $this->httpGet(self::DIRECTIONS_API_URL, $params);
        $this->recordApiCall('traffic', 0.01);

        $this->validateDirectionsResponse($response);

        $leg = $response['routes'][0]['legs'][0] ?? [];

        $currentDuration = $leg['duration_in_traffic']['value'] ?? $leg['duration']['value'] ?? 0;
        $typicalDuration = $leg['duration']['value'] ?? $currentDuration;

        return TrafficData::fromArray([
            'current_duration' => $currentDuration,
            'typical_duration' => $typicalDuration,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doHealthCheck(): bool {
        // Simple geocode request to check API availability
        $params = [
            'address' => 'São Paulo, Brazil',
            'key' => $this->apiKey,
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);

        return ($response['status'] ?? '') === 'OK';
    }

    /**
     * Validate directions API response.
     */
    private function validateDirectionsResponse(array $response): void
    {
        $status = $response['status'] ?? 'UNKNOWN';

        if ($status === 'OK') {
            return;
        }

        throw match ($status) {
            'NOT_FOUND', 'ZERO_RESULTS' => MapProviderException::noRouteFound(self::PROVIDER_NAME),
            'REQUEST_DENIED' => MapProviderException::authenticationFailed(self::PROVIDER_NAME),
            'OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT' => MapProviderException::quotaExceeded(self::PROVIDER_NAME),
            default => MapProviderException::invalidResponse(self::PROVIDER_NAME, "Status: {$status}"),
        };
    }

    /**
     * Validate geocoding API response.
     */
    private function validateGeocodingResponse(array $response): void
    {
        $status = $response['status'] ?? 'UNKNOWN';

        if ($status === 'OK' || $status === 'ZERO_RESULTS') {
            return;
        }

        throw match ($status) {
            'REQUEST_DENIED' => MapProviderException::authenticationFailed(self::PROVIDER_NAME),
            'OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT' => MapProviderException::quotaExceeded(self::PROVIDER_NAME),
            default => MapProviderException::invalidResponse(self::PROVIDER_NAME, "Status: {$status}"),
        };
    }

    /**
     * Parse route from Google Maps response.
     */
    private function parseRoute(array $routeData, Coordinates $origin, Coordinates $destination): Route
    {
        $leg = $routeData['legs'][0] ?? [];

        $waypoints = [];
        foreach ($routeData['legs'] ?? [] as $leg) {
            foreach ($leg['steps'] ?? [] as $step) {
                if (isset($step['end_location'])) {
                    $waypoints[] = new Coordinates(
                        $step['end_location']['lat'],
                        $step['end_location']['lng']
                    );
                }
            }
        }

        return Route::fromArray([
            'id' => uniqid('google_route_'),
            'origin' => $origin,
            'destination' => $destination,
            'waypoints' => $waypoints,
            'distance' => $leg['distance']['value'] ?? 0,
            'duration' => $leg['duration_in_traffic']['value'] ?? $leg['duration']['value'] ?? 0,
            'polyline' => $routeData['overview_polyline']['points'] ?? '',
            'provider' => self::PROVIDER_NAME,
        ]);
    }

    /**
     * Parse address from Google Maps response.
     */
    private function parseAddress(array $result): Address
    {
        $components = $this->parseAddressComponents($result['address_components'] ?? []);

        return Address::fromArray([
            'formatted_address' => $result['formatted_address'] ?? '',
            'coordinates' => new Coordinates(
                $result['geometry']['location']['lat'] ?? 0,
                $result['geometry']['location']['lng'] ?? 0
            ),
            'street' => $components['route'] ?? null,
            'number' => $components['street_number'] ?? null,
            'neighborhood' => $components['sublocality'] ?? $components['sublocality_level_1'] ?? null,
            'city' => $components['administrative_area_level_2'] ?? $components['locality'] ?? null,
            'state' => $components['administrative_area_level_1'] ?? null,
            'country' => $components['country'] ?? null,
            'postal_code' => $components['postal_code'] ?? null,
        ]);
    }

    /**
     * Parse address components into a keyed array.
     */
    private function parseAddressComponents(array $components): array
    {
        $parsed = [];

        foreach ($components as $component) {
            foreach ($component['types'] ?? [] as $type) {
                $parsed[$type] = $component['long_name'] ?? '';
            }
        }

        return $parsed;
    }
}
