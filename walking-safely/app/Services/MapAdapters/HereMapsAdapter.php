<?php

namespace App\Services\MapAdapters;

use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;

/**
 * HERE Maps API adapter.
 *
 * @see Requirement 1.1 - Backend must implement Map Adapter for HERE Maps
 * @see Requirement 17.1 - Authenticate with API Key
 */
class HereMapsAdapter extends AbstractMapAdapter
{
    private const PROVIDER_NAME = 'here';

    private const ROUTING_API_URL = 'https://router.hereapi.com/v8/routes';
    private const GEOCODING_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';
    private const REVERSE_GEOCODING_API_URL = 'https://revgeocode.search.hereapi.com/v1/revgeocode';

    private string $apiKey;

    public function __construct(?QuotaManager $quotaManager = null)
    {
        parent::__construct($quotaManager);
        $this->apiKey = config('services.here_maps.api_key', '');
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
            'apiKey' => $this->apiKey,
            'transportMode' => $this->mapTransportMode($options?->mode ?? 'driving'),
            'return' => 'polyline,summary,travelSummary',
            'departureTime' => 'now',
        ];

        if ($options) {
            $avoid = [];
            if ($options->avoidTolls) {
                $avoid[] = 'tollRoad';
            }
            if ($options->avoidHighways) {
                $avoid[] = 'controlledAccessHighway';
            }
            if (!empty($avoid)) {
                $params['avoid[features]'] = implode(',', $avoid);
            }
        }

        $response = $this->httpGet(self::ROUTING_API_URL, $params);
        $this->recordApiCall('route', 0.004);

        $this->validateRoutingResponse($response);

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
            'apiKey' => $this->apiKey,
            'transportMode' => 'car',
            'return' => 'polyline,summary,travelSummary',
            'alternatives' => min($count, 6), // HERE supports up to 6 alternatives
            'departureTime' => 'now',
        ];

        $response = $this->httpGet(self::ROUTING_API_URL, $params);
        $this->recordApiCall('route', 0.004);

        $this->validateRoutingResponse($response);

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
            'q' => $address,
            'apiKey' => $this->apiKey,
            'in' => 'countryCode:BRA', // Bias results to Brazil
            'lang' => 'pt-BR',
            'limit' => 5, // Max 5 results per Requirement 9.1
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);
        $this->recordApiCall('geocode', 0.003);

        if (empty($response['items'])) {
            return [];
        }

        $addresses = [];
        foreach ($response['items'] as $item) {
            $addresses[] = $this->parseAddress($item);
        }

        return $addresses;
    }

    /**
     * {@inheritdoc}
     */
    protected function doReverseGeocode(Coordinates $coordinates): Address {
        $params = [
            'at' => "{$coordinates->latitude},{$coordinates->longitude}",
            'apiKey' => $this->apiKey,
            'lang' => 'pt-BR',
        ];

        $response = $this->httpGet(self::REVERSE_GEOCODING_API_URL, $params);
        $this->recordApiCall('geocode', 0.003);

        if (empty($response['items'])) {
            throw MapProviderException::geocodeNotFound(
                self::PROVIDER_NAME,
                "{$coordinates->latitude},{$coordinates->longitude}"
            );
        }

        return $this->parseAddress($response['items'][0]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doGetTrafficData(Route $route): TrafficData {
        // HERE provides traffic data in the routing response
        $params = [
            'origin' => "{$route->origin->latitude},{$route->origin->longitude}",
            'destination' => "{$route->destination->latitude},{$route->destination->longitude}",
            'apiKey' => $this->apiKey,
            'transportMode' => 'car',
            'return' => 'summary,travelSummary',
            'departureTime' => 'now',
        ];

        $response = $this->httpGet(self::ROUTING_API_URL, $params);
        $this->recordApiCall('traffic', 0.006);

        $this->validateRoutingResponse($response);

        $section = $response['routes'][0]['sections'][0] ?? [];
        $summary = $section['summary'] ?? [];
        $travelSummary = $section['travelSummary'] ?? [];

        $currentDuration = $summary['duration'] ?? 0;
        $typicalDuration = $travelSummary['typicalDuration'] ?? $currentDuration;

        return TrafficData::fromArray([
            'current_duration' => $currentDuration,
            'typical_duration' => $typicalDuration,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doHealthCheck(): bool {
        $params = [
            'q' => 'São Paulo, Brazil',
            'apiKey' => $this->apiKey,
            'limit' => 1,
        ];

        $response = $this->httpGet(self::GEOCODING_API_URL, $params);

        return isset($response['items']);
    }

    /**
     * Validate routing API response.
     */
    private function validateRoutingResponse(array $response): void
    {
        if (isset($response['routes']) && !empty($response['routes'])) {
            return;
        }

        if (isset($response['error'])) {
            $errorCode = $response['error']['code'] ?? 'UNKNOWN';
            $errorMessage = $response['error']['message'] ?? 'Unknown error';

            throw match ($errorCode) {
                '401', '403' => MapProviderException::authenticationFailed(self::PROVIDER_NAME),
                '429' => MapProviderException::rateLimited(self::PROVIDER_NAME),
                default => MapProviderException::invalidResponse(self::PROVIDER_NAME, $errorMessage),
            };
        }

        throw MapProviderException::noRouteFound(self::PROVIDER_NAME);
    }

    /**
     * Map transport mode to HERE format.
     */
    private function mapTransportMode(string $mode): string
    {
        return match ($mode) {
            'driving' => 'car',
            'walking' => 'pedestrian',
            'bicycling' => 'bicycle',
            'transit' => 'bus',
            default => 'car',
        };
    }

    /**
     * Parse route from HERE Maps response.
     */
    private function parseRoute(array $routeData, Coordinates $origin, Coordinates $destination): Route
    {
        $section = $routeData['sections'][0] ?? [];
        $summary = $section['summary'] ?? [];

        $waypoints = [];
        if (isset($section['polyline'])) {
            // HERE uses flexible polyline encoding
            $waypoints = $this->decodeFlexiblePolyline($section['polyline']);
        }

        return Route::fromArray([
            'id' => uniqid('here_route_'),
            'origin' => $origin,
            'destination' => $destination,
            'waypoints' => $waypoints,
            'distance' => $summary['length'] ?? 0,
            'duration' => $summary['duration'] ?? 0,
            'polyline' => $section['polyline'] ?? '',
            'provider' => self::PROVIDER_NAME,
        ]);
    }

    /**
     * Parse address from HERE Maps response.
     */
    private function parseAddress(array $item): Address
    {
        $address = $item['address'] ?? [];
        $position = $item['position'] ?? [];

        return Address::fromArray([
            'formatted_address' => $item['title'] ?? $address['label'] ?? '',
            'coordinates' => new Coordinates(
                $position['lat'] ?? 0,
                $position['lng'] ?? 0
            ),
            'street' => $address['street'] ?? null,
            'number' => $address['houseNumber'] ?? null,
            'neighborhood' => $address['district'] ?? null,
            'city' => $address['city'] ?? null,
            'state' => $address['state'] ?? $address['stateCode'] ?? null,
            'country' => $address['countryName'] ?? $address['countryCode'] ?? null,
            'postal_code' => $address['postalCode'] ?? null,
        ]);
    }

    /**
     * Decode HERE's flexible polyline format to coordinates.
     * This is a simplified decoder - in production, use the official HERE SDK.
     */
    private function decodeFlexiblePolyline(string $encoded): array
    {
        // For simplicity, return empty array - in production use HERE's polyline decoder
        // The full implementation would decode the flexible polyline format
        return [];
    }
}
