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
     * POST /api/routes
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
     * POST /api/routes/recalculate
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
