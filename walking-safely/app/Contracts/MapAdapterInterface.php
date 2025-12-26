<?php

namespace App\Contracts;

use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\TrafficData;

/**
 * Interface for map provider adapters.
 *
 * This interface abstracts the differences between map providers (Google Maps, HERE Maps, Mapbox),
 * exposing a unified API for route calculation, geocoding, and traffic data.
 *
 * @see Requirements 1.1 - Backend must implement a Map Adapter exposing unified internal APIs
 */
interface MapAdapterInterface
{
    /**
     * Calculate a route between origin and destination.
     *
     * @param Coordinates $origin Starting point coordinates
     * @param Coordinates $destination Ending point coordinates
     * @param RouteOptions|null $options Optional route calculation options
     * @return Route The calculated route
     * @throws \App\Exceptions\MapProviderException When the provider fails to calculate the route
     */
    public function calculateRoute(
        Coordinates $origin,
        Coordinates $destination,
        ?RouteOptions $options = null
    ): Route;

    /**
     * Calculate multiple alternative routes between origin and destination.
     *
     * @param Coordinates $origin Starting point coordinates
     * @param Coordinates $destination Ending point coordinates
     * @param int $count Maximum number of alternative routes to return
     * @return Route[] Array of alternative routes
     * @throws \App\Exceptions\MapProviderException When the provider fails to calculate routes
     */
    public function calculateAlternativeRoutes(
        Coordinates $origin,
        Coordinates $destination,
        int $count = 3
    ): array;

    /**
     * Geocode an address string to coordinates.
     *
     * @param string $address The address to geocode
     * @return Address[] Array of matching addresses (max 5 results per Requirement 9.1)
     * @throws \App\Exceptions\MapProviderException When the provider fails to geocode
     */
    public function geocode(string $address): array;

    /**
     * Reverse geocode coordinates to an address.
     *
     * @param Coordinates $coordinates The coordinates to reverse geocode
     * @return Address The address at the given coordinates
     * @throws \App\Exceptions\MapProviderException When the provider fails to reverse geocode
     */
    public function reverseGeocode(Coordinates $coordinates): Address;

    /**
     * Get traffic data for a route.
     *
     * @param Route $route The route to get traffic data for
     * @return TrafficData Traffic information for the route
     * @throws \App\Exceptions\MapProviderException When the provider fails to get traffic data
     */
    public function getTrafficData(Route $route): TrafficData;

    /**
     * Get the name of the map provider.
     *
     * @return string Provider name (e.g., 'google', 'here', 'mapbox')
     */
    public function getProviderName(): string;

    /**
     * Check if the provider is currently available.
     *
     * @return bool True if the provider is available and responding
     */
    public function isAvailable(): bool;
}
