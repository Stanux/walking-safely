<?php

namespace App\Services\MapAdapters;

use App\Exceptions\MapProviderException;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;

/**
 * Nominatim (OpenStreetMap) API adapter.
 * Free geocoding service with no API key required.
 */
class NominatimAdapter extends AbstractMapAdapter
{
    private const PROVIDER_NAME = 'nominatim';

    private const GEOCODING_API_URL = 'https://nominatim.openstreetmap.org/search';
    private const REVERSE_GEOCODING_API_URL = 'https://nominatim.openstreetmap.org/reverse';
    private const ROUTING_API_URL = 'https://router.project-osrm.org/route/v1';

    public function __construct(?QuotaManager $quotaManager = null)
    {
        parent::__construct($quotaManager);
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
        $mode = $this->mapTransportMode($options?->mode ?? 'walking');
        $url = self::ROUTING_API_URL . "/{$mode}/{$origin->longitude},{$origin->latitude};{$destination->longitude},{$destination->latitude}";
        
        $params = [
            'overview' => 'full',
            'geometries' => 'polyline',
            'steps' => 'true',
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('route', 0);

        if (empty($response['routes'])) {
            throw MapProviderException::noRouteFound(self::PROVIDER_NAME);
        }

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
        $url = self::ROUTING_API_URL . "/walking/{$origin->longitude},{$origin->latitude};{$destination->longitude},{$destination->latitude}";
        
        $params = [
            'overview' => 'full',
            'geometries' => 'polyline',
            'alternatives' => 'true',
        ];

        $response = $this->httpGet($url, $params);
        $this->recordApiCall('route', 0);

        if (empty($response['routes'])) {
            throw MapProviderException::noRouteFound(self::PROVIDER_NAME);
        }

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
    protected function doGeocode(string $address): array
    {
        $params = [
            'q' => $address,
            'format' => 'json',
            'addressdetails' => 1,
            'limit' => 5,
            'countrycodes' => 'br',
            'accept-language' => 'pt-BR',
        ];

        $response = $this->httpGetWithHeaders(self::GEOCODING_API_URL, $params, [
            'User-Agent' => 'WalkingSafely/1.0 (contact@walkingsafely.com)',
        ]);
        $this->recordApiCall('geocode', 0);

        if (empty($response)) {
            return [];
        }

        $addresses = [];
        foreach ($response as $item) {
            $addresses[] = $this->parseAddress($item);
        }

        return $addresses;
    }

    /**
     * {@inheritdoc}
     */
    protected function doReverseGeocode(Coordinates $coordinates): Address
    {
        $params = [
            'lat' => $coordinates->latitude,
            'lon' => $coordinates->longitude,
            'format' => 'json',
            'addressdetails' => 1,
            'accept-language' => 'pt-BR',
        ];

        $response = $this->httpGetWithHeaders(self::REVERSE_GEOCODING_API_URL, $params, [
            'User-Agent' => 'WalkingSafely/1.0 (contact@walkingsafely.com)',
        ]);
        $this->recordApiCall('geocode', 0);

        if (empty($response) || isset($response['error'])) {
            throw MapProviderException::geocodeNotFound(
                self::PROVIDER_NAME,
                "{$coordinates->latitude},{$coordinates->longitude}"
            );
        }

        return $this->parseAddress($response);
    }

    /**
     * {@inheritdoc}
     */
    protected function doGetTrafficData(Route $route): TrafficData
    {
        // Nominatim/OSRM doesn't provide real-time traffic data
        // Return estimated data based on route duration
        return TrafficData::fromArray([
            'current_duration' => $route->duration,
            'typical_duration' => $route->duration,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    protected function doHealthCheck(): bool
    {
        $params = [
            'q' => 'São Paulo, Brazil',
            'format' => 'json',
            'limit' => 1,
        ];

        $response = $this->httpGetWithHeaders(self::GEOCODING_API_URL, $params, [
            'User-Agent' => 'WalkingSafely/1.0 (contact@walkingsafely.com)',
        ]);

        return is_array($response) && !empty($response);
    }

    /**
     * Make HTTP GET request with custom headers.
     */
    protected function httpGetWithHeaders(string $url, array $query = [], array $headers = []): array
    {
        $response = \Illuminate\Support\Facades\Http::timeout(10)
            ->withHeaders($headers)
            ->get($url, $query);

        if ($response->failed()) {
            throw MapProviderException::invalidResponse(
                self::PROVIDER_NAME,
                "HTTP {$response->status()}: {$response->body()}"
            );
        }

        return $response->json() ?? [];
    }

    /**
     * Map transport mode to OSRM format.
     */
    private function mapTransportMode(string $mode): string
    {
        return match ($mode) {
            'driving' => 'driving',
            'walking' => 'foot',
            'bicycling' => 'bike',
            default => 'foot',
        };
    }

    /**
     * Parse route from OSRM response.
     */
    private function parseRoute(array $routeData, Coordinates $origin, Coordinates $destination): Route
    {
        $waypoints = [];
        if (isset($routeData['geometry'])) {
            $waypoints = $this->decodePolyline($routeData['geometry']);
        }

        return Route::fromArray([
            'id' => uniqid('osrm_route_'),
            'origin' => $origin,
            'destination' => $destination,
            'waypoints' => $waypoints,
            'distance' => $routeData['distance'] ?? 0,
            'duration' => $routeData['duration'] ?? 0,
            'polyline' => $routeData['geometry'] ?? '',
            'provider' => self::PROVIDER_NAME,
        ]);
    }

    /**
     * Parse address from Nominatim response.
     */
    private function parseAddress(array $item): Address
    {
        $addr = $item['address'] ?? [];

        $formattedAddress = $item['display_name'] ?? '';
        
        return Address::fromArray([
            'formatted_address' => $formattedAddress,
            'coordinates' => new Coordinates(
                (float) ($item['lat'] ?? 0),
                (float) ($item['lon'] ?? 0)
            ),
            'street' => $addr['road'] ?? $addr['pedestrian'] ?? null,
            'number' => $addr['house_number'] ?? null,
            'neighborhood' => $addr['suburb'] ?? $addr['neighbourhood'] ?? null,
            'city' => $addr['city'] ?? $addr['town'] ?? $addr['municipality'] ?? null,
            'state' => $addr['state'] ?? null,
            'country' => $addr['country'] ?? null,
            'postal_code' => $addr['postcode'] ?? null,
        ]);
    }

    /**
     * Decode Google-style polyline to coordinates.
     */
    private function decodePolyline(string $encoded): array
    {
        $points = [];
        $index = 0;
        $len = strlen($encoded);
        $lat = 0;
        $lng = 0;

        while ($index < $len) {
            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $dlat = (($result & 1) ? ~($result >> 1) : ($result >> 1));
            $lat += $dlat;

            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $dlng = (($result & 1) ? ~($result >> 1) : ($result >> 1));
            $lng += $dlng;

            $points[] = new Coordinates($lat / 1e5, $lng / 1e5);
        }

        return $points;
    }
}
