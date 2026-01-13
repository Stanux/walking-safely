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
     * @OA\Get(
     *     path="/geocode",
     *     operationId="geocode",
     *     tags={"Geocoding"},
     *     summary="Geocodificar endereço",
     *     description="Converte um endereço em coordenadas geográficas. Retorna até 5 resultados em até 2 segundos.",
     *     @OA\Parameter(
     *         name="query",
     *         in="query",
     *         required=true,
     *         description="Endereço a ser geocodificado (mínimo 3 caracteres)",
     *         @OA\Schema(type="string", minLength=3, maxLength=255, example="Av. Paulista, São Paulo")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Resultados da geocodificação",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/Address")
     *             ),
     *             @OA\Property(property="count", type="integer", example=3)
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     ),
     *     @OA\Response(
     *         response=503,
     *         description="Serviço de geocodificação indisponível",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
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
     * @OA\Get(
     *     path="/reverse-geocode",
     *     operationId="reverseGeocode",
     *     tags={"Geocoding"},
     *     summary="Geocodificação reversa",
     *     description="Converte coordenadas geográficas em um endereço",
     *     @OA\Parameter(
     *         name="latitude",
     *         in="query",
     *         required=true,
     *         description="Latitude",
     *         @OA\Schema(type="number", format="float", minimum=-90, maximum=90, example=-23.5505)
     *     ),
     *     @OA\Parameter(
     *         name="longitude",
     *         in="query",
     *         required=true,
     *         description="Longitude",
     *         @OA\Schema(type="number", format="float", minimum=-180, maximum=180, example=-46.6333)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Endereço encontrado",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/Address")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     ),
     *     @OA\Response(
     *         response=503,
     *         description="Serviço de geocodificação indisponível",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
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
