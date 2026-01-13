<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CalculateRouteRequest;
use App\Http\Requests\RecalculateRouteRequest;
use App\Http\Resources\RouteWithRiskResource;
use App\Http\Resources\RouteRecalculationResource;
use App\Services\RouteService;
use App\ValueObjects\Coordinates;
use Illuminate\Http\JsonResponse;

/**
 * Controller for route calculation and navigation.
 *
 * @see Requirement 2.1 - Calculate routes between two points
 * @see Requirement 3.1 - Recalculate route during active navigation
 * @see Requirement 4.1 - Calculate safe routes minimizing risk exposure
 */
class RouteController extends Controller
{
    public function __construct(
        private RouteService $routeService
    ) {}

    /**
     * Calculate a route between origin and destination.
     *
     * @OA\Post(
     *     path="/routes",
     *     operationId="calculateRoute",
     *     tags={"Routes"},
     *     summary="Calcular rota",
     *     description="Calcula uma rota entre origem e destino com análise de risco. Pode opcionalmente iniciar uma sessão de navegação.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"origin", "destination"},
     *             @OA\Property(
     *                 property="origin",
     *                 type="object",
     *                 required={"latitude", "longitude"},
     *                 @OA\Property(property="latitude", type="number", format="float", example=-23.5505),
     *                 @OA\Property(property="longitude", type="number", format="float", example=-46.6333)
     *             ),
     *             @OA\Property(
     *                 property="destination",
     *                 type="object",
     *                 required={"latitude", "longitude"},
     *                 @OA\Property(property="latitude", type="number", format="float", example=-23.5629),
     *                 @OA\Property(property="longitude", type="number", format="float", example=-46.6544)
     *             ),
     *             @OA\Property(property="prefer_safe_route", type="boolean", example=true, description="Preferir rota mais segura"),
     *             @OA\Property(property="start_navigation", type="boolean", example=false, description="Iniciar sessão de navegação")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Rota calculada com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/RouteWithRisk"),
     *             @OA\Property(
     *                 property="occurrences",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/Occurrence")
     *             ),
     *             @OA\Property(property="session_id", type="integer", nullable=true, example=123)
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     ),
     *     @OA\Response(
     *         response=503,
     *         description="Serviço de mapas indisponível",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     *
     * @see Requirement 2.1 - Calculate route and return trajectory, estimated time, and total distance
     * @see Requirement 2.4 - Analyze risk index of all regions in route
     * @see Requirement 4.1 - Calculate safe routes when prefer_safe_route is enabled
     */
    public function calculate(CalculateRouteRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $origin = new Coordinates(
            $validated['origin']['latitude'],
            $validated['origin']['longitude']
        );

        $destination = new Coordinates(
            $validated['destination']['latitude'],
            $validated['destination']['longitude']
        );

        $preferSafeRoute = $validated['prefer_safe_route'] ?? false;

        $routeWithRisk = $this->routeService->calculateRouteWithRisk(
            $origin,
            $destination,
            $preferSafeRoute
        );

        // Get occurrences along the route
        $occurrences = $this->routeService->getOccurrencesAlongRoute($routeWithRisk->route);

        // Optionally start a navigation session
        $session = null;
        if ($validated['start_navigation'] ?? false) {
            $session = $this->routeService->startNavigationSession(
                $routeWithRisk,
                $request->user()?->id
            );
        }

        return response()->json([
            'data' => new RouteWithRiskResource($routeWithRisk),
            'occurrences' => \App\Http\Resources\OccurrenceResource::collection($occurrences),
            'session_id' => $session?->id,
        ], 200);
    }

    /**
     * Recalculate route during active navigation.
     *
     * @OA\Post(
     *     path="/routes/recalculate",
     *     operationId="recalculateRoute",
     *     tags={"Routes"},
     *     summary="Recalcular rota",
     *     description="Recalcula a rota durante navegação ativa. Acionado quando tempo de viagem aumenta >10% ou usuário sai da rota.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"session_id", "current_position"},
     *             @OA\Property(property="session_id", type="integer", example=123, description="ID da sessão de navegação ativa"),
     *             @OA\Property(
     *                 property="current_position",
     *                 type="object",
     *                 required={"latitude", "longitude"},
     *                 @OA\Property(property="latitude", type="number", format="float", example=-23.5550),
     *                 @OA\Property(property="longitude", type="number", format="float", example=-46.6400)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Rota recalculada com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/RouteRecalculation")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação ou sessão não encontrada",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     )
     * )
     *
     * @see Requirement 3.1 - Recalculate if travel time increases > 10%
     * @see Requirement 3.4 - Re-evaluate risk index for new route
     * @see Requirement 3.5 - Inform user if risk level changes
     */
    public function recalculate(RecalculateRouteRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $currentPosition = new Coordinates(
            $validated['current_position']['latitude'],
            $validated['current_position']['longitude']
        );

        $result = $this->routeService->recalculateRoute(
            $validated['session_id'],
            $currentPosition
        );

        return response()->json([
            'data' => new RouteRecalculationResource($result),
        ], 200);
    }
}
