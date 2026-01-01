<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GeocodeRequest;
use App\Http\Requests\ReverseGeocodeRequest;
use App\Http\Resources\AddressResource;
use App\Http\Resources\AddressCollection;
use App\Services\GeocodingService;
use App\ValueObjects\Coordinates;
use App\Exceptions\MapProviderException;
use Illuminate\Http\JsonResponse;

/**
 * Controller for geocoding operations.
 *
 * @see Requirement 9.1 - Return up to 5 results in up to 2 seconds
 * @see Requirement 9.2 - Show address, city, and geographic coordinates for each result
 */
class GeocodingController extends Controller
{
    public function __construct(
        private GeocodingService $geocodingService
    ) {}

    /**
     * Geocode an address string to coordinates.
     *
     * GET /api/geocode
     *
     * @see Requirement 9.1 - Return up to 5 matching results in up to 2 seconds
     */
    public function geocode(GeocodeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Log detalhado para debug
        \Log::info('Geocoding request received', [
            'query' => $validated['query'],
            'provider' => config('services.map_provider'),
            'google_key_set' => !empty(config('services.google_maps.api_key'))
        ]);

        try {
            $results = $this->geocodingService->geocode($validated['query']);

            \Log::info('Geocoding successful', [
                'query' => $validated['query'],
                'results_count' => count($results)
            ]);

            return response()->json([
                'data' => AddressCollection::make($results),
                'count' => count($results),
            ]);
        } catch (MapProviderException $e) {
            \Log::error('Geocoding failed', [
                'query' => $validated['query'],
                'error' => $e->getMessage(),
                'provider' => config('services.map_provider')
            ]);

            return response()->json([
                'error' => 'geocoding_failed',
                'message' => __('messages.geocoding_failed'),
                'debug' => [
                    'provider' => config('services.map_provider'),
                    'error' => $e->getMessage(),
                    'env_provider' => env('MAP_PROVIDER'),
                    'google_key' => !empty(config('services.google_maps.api_key')) ? 'SET' : 'NOT_SET'
                ]
            ], 503);
        }
    }

    /**
     * Reverse geocode coordinates to an address.
     *
     * GET /api/reverse-geocode
     *
     * @see Requirement 9.2 - Show address, city, and geographic coordinates
     */
    public function reverseGeocode(ReverseGeocodeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $coordinates = new Coordinates(
            $validated['latitude'],
            $validated['longitude']
        );

        try {
            $result = $this->geocodingService->reverseGeocode($coordinates);

            return response()->json([
                'data' => new AddressResource($result),
            ]);
        } catch (MapProviderException $e) {
            return response()->json([
                'error' => 'reverse_geocoding_failed',
                'message' => __('messages.reverse_geocoding_failed'),
            ], 503);
        }
    }
}
