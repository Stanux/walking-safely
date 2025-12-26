<?php

namespace App\Services\MapAdapters;

use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;

/**
 * Mapbox API adapter.
 *
 * @see Requirement 1.1 - Backend must implement Map Adapter for Mapbox
 * @see Requirement 17.1 - Authenticate with API Key
 */
class MapboxAdapter extends AbstractMapAdapter
{
    private const PROVIDER_NAME = 'mapbox';

    private const DIRECTIONS_API_URL = 'https://api.mapbox.com/directions/v5/mapbox';
    private const GEOCODING_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

    private string $apiKey;

    public function __construct(?QuotaManager $quotaManager = null)
    {
        parent::__construct($quotaManager);
        $this->apiKey = config('services.mapbox.api_key', '');
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
        $profile = $this->mapTransportMode($options?->mode ?? 'driving');
        $coordinates = "{$origin->longitude},{$origin->latitude};{$destination->longitude},{$destination->latitude}";

        $url = self::DIRECTIONS_API_URL . "/{$profile}/{$coordinates}";

        $params = [
            'access_token' => $this->apiKey,
            'geometries' => 'polyline',
            'overview' => 'full',
            'steps' => 'true',
            'annotations' => 'duration,distance',
        ];

        if ($options) {
            $exclude = [];
            if ($options->avoidTolls) {
                $exclude[] = 'toll';
            }
            if (!empty($exclude)) {
                $params['exclude'] = implode(',', $exclude);
            }

            if ($options->departureTime) {
                $params['depart_at'] = $options->departureTime;
            }
        }

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('route', 0.0005);

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
        $coordinates = "{$origin->longitude},{$origin->latitude};{$destination->longitude},{$destination->latitude}";
        $url = self::DIRECTIONS_API_URL . "/driving-traffic/{$coordinates}";

        $params = [
            'access_token' => $this->apiKey,
            'geometries' => 'polyline',
            'overview' => 'full',
            'steps' => 'true',
            'alternatives' => 'true',
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('route', 0.0005);

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
        $encodedAddress = urlencode($address);
        $url = self::GEOCODING_API_URL . "/{$encodedAddress}.json";

        $params = [
            'access_token' => $this->apiKey,
            'country' => 'br', // Bias results to Brazil
            'language' => 'pt',
            'limit' => 5, // Max 5 results per Requirement 9.1
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('geocode', 0.0005);

        if (empty($response['features'])) {
            return [];
        }

        $addresses = [];
        foreach ($response['features'] as $feature) {
            $addresses[] = $this->parseAddress($feature);
        }

        return $addresses;
    }

    /**
     * {@inheritdoc}
     */
    protected function doReverseGeocode(Coordinates $coordinates): Address {
        $url = self::GEOCODING_API_URL . "/{$coordinates->longitude},{$coordinates->latitude}.json";

        $params = [
            'access_token' => $this->apiKey,
            'language' => 'pt',
            'limit' => 1,
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('geocode', 0.0005);

        if (empty($response['features'])) {
            throw MapProviderException::geocodeNotFound(
                self::PROVIDER_NAME,
                "{$coordinates->latitude},{$coordinates->longitude}"
            );
        }

        return $this->parseAddress($response['features'][0]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doGetTrafficData(Route $route): TrafficData {
        // Mapbox provides traffic data with driving-traffic profile
        $coordinates = "{$route->origin->longitude},{$route->origin->latitude};{$route->destination->longitude},{$route->destination->latitude}";
        $url = self::DIRECTIONS_API_URL . "/driving-traffic/{$coordinates}";

        $params = [
            'access_token' => $this->apiKey,
            'overview' => 'full',
            'annotations' => 'duration,congestion',
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('traffic', 0.001);

        $this->validateDirectionsResponse($response);

        $routeData = $response['routes'][0] ?? [];

        // Get duration with traffic
        $currentDuration = (int) ($routeData['duration'] ?? 0);

        // Get typical duration (without traffic) by using regular driving profile
        $typicalUrl = self::DIRECTIONS_API_URL . "/driving/{$coordinates}";
        $typicalResponse = $this->httpGet($typicalUrl, [
            'access_token' => $this->apiKey,
            'overview' => 'false',
        ]);

        $typicalDuration = (int) ($typicalResponse['routes'][0]['duration'] ?? $currentDuration);

        return TrafficData::fromArray([
            'current_duration' => $currentDuration,
            'typical_duration' => $typicalDuration,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doHealthCheck(): bool {
        $url = self::GEOCODING_API_URL . "/São Paulo.json";

        $params = [
            'access_token' => $this->apiKey,
            'limit' => 1,
        ];

        $response = $this->httpGet($url, $params);

        return isset($response['features']);
    }

    /**
     * Validate directions API response.
     */
    private function validateDirectionsResponse(array $response): void
    {
        if (isset($response['routes']) && !empty($response['routes'])) {
            return;
        }

        $code = $response['code'] ?? 'Unknown';
        $message = $response['message'] ?? 'Unknown error';

        throw match ($code) {
            'NoRoute' => MapProviderException::noRouteFound(self::PROVIDER_NAME),
            'InvalidInput' => MapProviderException::invalidResponse(self::PROVIDER_NAME, $message),
            'Forbidden' => MapProviderException::authenticationFailed(self::PROVIDER_NAME),
            default => MapProviderException::invalidResponse(self::PROVIDER_NAME, "{$code}: {$message}"),
        };
    }

    /**
     * Map transport mode to Mapbox profile.
     */
    private function mapTransportMode(string $mode): string
    {
        return match ($mode) {
            'driving' => 'driving-traffic',
            'walking' => 'walking',
            'bicycling' => 'cycling',
            default => 'driving-traffic',
        };
    }

    /**
     * Parse route from Mapbox response.
     */
    private function parseRoute(array $routeData, Coordinates $origin, Coordinates $destination): Route
    {
        $waypoints = [];
        foreach ($routeData['legs'] ?? [] as $leg) {
            foreach ($leg['steps'] ?? [] as $step) {
                if (isset($step['maneuver']['location'])) {
                    $loc = $step['maneuver']['location'];
                    $waypoints[] = new Coordinates($loc[1], $loc[0]); // Mapbox uses [lng, lat]
                }
            }
        }

        return Route::fromArray([
            'id' => uniqid('mapbox_route_'),
            'origin' => $origin,
            'destination' => $destination,
            'waypoints' => $waypoints,
            'distance' => $routeData['distance'] ?? 0,
            'duration' => (int) ($routeData['duration'] ?? 0),
            'polyline' => $routeData['geometry'] ?? '',
            'provider' => self::PROVIDER_NAME,
        ]);
    }

    /**
     * Parse address from Mapbox response.
     */
    private function parseAddress(array $feature): Address
    {
        $context = $this->parseContext($feature['context'] ?? []);
        $center = $feature['center'] ?? [0, 0];

        return Address::fromArray([
            'formatted_address' => $feature['place_name'] ?? '',
            'coordinates' => new Coordinates($center[1], $center[0]), // Mapbox uses [lng, lat]
            'street' => $feature['text'] ?? null,
            'number' => $feature['address'] ?? null,
            'neighborhood' => $context['neighborhood'] ?? $context['locality'] ?? null,
            'city' => $context['place'] ?? null,
            'state' => $context['region'] ?? null,
            'country' => $context['country'] ?? null,
            'postal_code' => $context['postcode'] ?? null,
        ]);
    }

    /**
     * Parse context array into keyed components.
     */
    private function parseContext(array $context): array
    {
        $parsed = [];

        foreach ($context as $item) {
            $id = $item['id'] ?? '';
            $type = explode('.', $id)[0] ?? '';
            $parsed[$type] = $item['text'] ?? '';
        }

        return $parsed;
    }
}
