<?php

namespace App\Services;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use App\Models\NavigationSession;
use App\Models\Occurrence;
use App\Models\RiskIndex;
use App\Services\MapAdapters\MapAdapterFactory;
use App\ValueObjects\Coordinates;
use App\ValueObjects\Route;
use App\ValueObjects\RouteOptions;
use App\ValueObjects\RouteRecalculationResult;
use App\ValueObjects\RouteRiskAnalysis;
use App\ValueObjects\RouteWithRisk;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service for route calculation with risk analysis.
 *
 * @see Requirement 2.1 - Calculate routes between two points
 * @see Requirement 2.4 - Analyze risk index of all regions in route
 * @see Requirement 3.1 - Recalculate route during active navigation
 * @see Requirement 4.1 - Calculate safe routes minimizing risk exposure
 */
class RouteService
{
    /**
     * Maximum distance increase allowed for safe routes (20%).
     */
    public const MAX_SAFE_ROUTE_DISTANCE_INCREASE = 1.20;

    /**
     * Threshold for significant time increase (10%).
     */
    public const SIGNIFICANT_TIME_INCREASE_THRESHOLD = 0.10;

    /**
     * Risk threshold for warnings.
     */
    public const WARNING_RISK_THRESHOLD = 50;

    /**
     * Cache TTL for routes in seconds (5 minutes).
     */
    public const ROUTE_CACHE_TTL = 300;

    private MapAdapterInterface $mapAdapter;
    private RiskService $riskService;

    public function __construct(
        ?MapAdapterInterface $mapAdapter = null,
        ?RiskService $riskService = null
    ) {
        $this->mapAdapter = $mapAdapter ?? (new MapAdapterFactory())->getAdapterWithFallback();
        $this->riskService = $riskService ?? new RiskService();
    }

    /**
     * Calculate a route with risk analysis.
     *
     * @see Requirement 2.1 - Calculate route and return trajectory, estimated time, and total distance
     * @see Requirement 2.4 - Analyze risk index of all regions in route
     *
     * @param Coordinates $origin Starting point
     * @param Coordinates $destination Ending point
     * @param bool $preferSafeRoute Whether to prefer safer routes
     * @return RouteWithRisk Route with risk analysis
     * @throws MapProviderException When route calculation fails
     */
    public function calculateRouteWithRisk(
        Coordinates $origin,
        Coordinates $destination,
        bool $preferSafeRoute = false
    ): RouteWithRisk {
        if ($preferSafeRoute) {
            return $this->calculateSafeRoute($origin, $destination);
        }

        $route = $this->mapAdapter->calculateRoute($origin, $destination);
        $riskAnalysis = $this->analyzeRouteRisk($route);

        return $this->buildRouteWithRisk($route, $riskAnalysis);
    }

    /**
     * Analyze the risk along a route.
     *
     * @see Requirement 2.4 - Analyze risk index of all regions in route
     * @see Requirement 2.6 - Warn if route passes through region with risk >= 50
     *
     * @param Route $route The route to analyze
     * @return RouteRiskAnalysis Risk analysis for the route
     */
    public function analyzeRouteRisk(Route $route): RouteRiskAnalysis
    {
        $waypoints = $this->getRouteWaypoints($route);
        $riskIndexes = $this->riskService->getRiskAlongRoute($waypoints);

        if (empty($riskIndexes)) {
            return new RouteRiskAnalysis(
                maxRiskIndex: 0,
                averageRiskIndex: 0,
                riskRegions: [],
                requiresWarning: false,
            );
        }

        $maxRisk = 0;
        $totalRisk = 0;
        $riskRegions = [];
        $highRiskCount = 0;
        $dominantCrimeType = null;
        $maxRiskRegion = null;

        foreach ($riskIndexes as $riskIndex) {
            $value = $riskIndex->value;
            $totalRisk += $value;

            if ($value > $maxRisk) {
                $maxRisk = $value;
                $maxRiskRegion = $riskIndex;
            }

            if ($riskIndex->isHighRisk()) {
                $highRiskCount++;
            }

            $riskRegions[] = [
                'region_id' => $riskIndex->region_id,
                'value' => $value,
                'is_high_risk' => $riskIndex->isHighRisk(),
                'dominant_crime_type_id' => $riskIndex->dominant_crime_type_id,
            ];
        }

        $averageRisk = count($riskIndexes) > 0 ? $totalRisk / count($riskIndexes) : 0;
        $requiresWarning = $maxRisk >= self::WARNING_RISK_THRESHOLD;

        // Get dominant crime type name from the highest risk region
        if ($maxRiskRegion && $maxRiskRegion->dominantCrimeType) {
            $dominantCrimeType = $maxRiskRegion->dominantCrimeType->getLocalizedName(app()->getLocale());
        }

        $warningMessage = null;
        if ($requiresWarning) {
            $warningMessage = $this->buildWarningMessage($maxRisk, $dominantCrimeType);
        }

        return new RouteRiskAnalysis(
            maxRiskIndex: $maxRisk,
            averageRiskIndex: $averageRisk,
            riskRegions: $riskRegions,
            requiresWarning: $requiresWarning,
            warningMessage: $warningMessage,
            dominantCrimeType: $dominantCrimeType,
            highRiskRegionCount: $highRiskCount,
        );
    }

    /**
     * Calculate a safe route that minimizes risk exposure.
     *
     * @see Requirement 4.1 - Calculate routes minimizing exposure to high risk regions
     * @see Requirement 4.3 - Accept routes up to 20% longer if they reduce risk
     * @see Requirement 4.4 - Compare alternatives and select lowest risk
     *
     * @param Coordinates $origin Starting point
     * @param Coordinates $destination Ending point
     * @return RouteWithRisk The safest route within distance constraints
     * @throws MapProviderException When route calculation fails
     */
    public function calculateSafeRoute(
        Coordinates $origin,
        Coordinates $destination
    ): RouteWithRisk {
        // Get multiple alternative routes
        $routes = $this->mapAdapter->calculateAlternativeRoutes($origin, $destination, 3);

        if (empty($routes)) {
            // Fallback to single route
            $route = $this->mapAdapter->calculateRoute($origin, $destination);
            $riskAnalysis = $this->analyzeRouteRisk($route);
            return $this->buildRouteWithRisk($route, $riskAnalysis);
        }

        // Analyze risk for all routes
        $routesWithRisk = [];
        $shortestDistance = PHP_FLOAT_MAX;

        foreach ($routes as $route) {
            $riskAnalysis = $this->analyzeRouteRisk($route);
            $routesWithRisk[] = [
                'route' => $route,
                'analysis' => $riskAnalysis,
            ];

            if ($route->distance < $shortestDistance) {
                $shortestDistance = $route->distance;
            }
        }

        // Filter routes within 20% distance increase
        $maxAllowedDistance = $shortestDistance * self::MAX_SAFE_ROUTE_DISTANCE_INCREASE;
        $eligibleRoutes = array_filter(
            $routesWithRisk,
            fn($r) => $r['route']->distance <= $maxAllowedDistance
        );

        if (empty($eligibleRoutes)) {
            $eligibleRoutes = $routesWithRisk;
        }

        // Select route with lowest max risk
        usort($eligibleRoutes, function ($a, $b) {
            // Primary: lower max risk
            $riskDiff = $a['analysis']->maxRiskIndex <=> $b['analysis']->maxRiskIndex;
            if ($riskDiff !== 0) {
                return $riskDiff;
            }
            // Secondary: lower average risk
            $avgDiff = $a['analysis']->averageRiskIndex <=> $b['analysis']->averageRiskIndex;
            if ($avgDiff !== 0) {
                return $avgDiff;
            }
            // Tertiary: shorter distance
            return $a['route']->distance <=> $b['route']->distance;
        });

        $safest = $eligibleRoutes[0];
        return $this->buildRouteWithRisk($safest['route'], $safest['analysis']);
    }

    /**
     * Recalculate route during active navigation.
     *
     * @see Requirement 3.1 - Recalculate if travel time increases > 10%
     * @see Requirement 3.4 - Re-evaluate risk index for new route
     * @see Requirement 3.5 - Inform user if risk level changes
     *
     * @param int $sessionId Navigation session ID
     * @param Coordinates $currentPosition Current user position
     * @return RouteRecalculationResult Result of recalculation
     * @throws MapProviderException When route calculation fails
     */
    public function recalculateRoute(
        int $sessionId,
        Coordinates $currentPosition
    ): RouteRecalculationResult {
        $session = NavigationSession::findOrFail($sessionId);

        if (!$session->isActive()) {
            throw new \InvalidArgumentException('Navigation session is not active');
        }

        $originalRoute = $session->getRoute();
        if (!$originalRoute) {
            throw new \InvalidArgumentException('Session has no route data');
        }

        // Get current traffic data
        $trafficData = $this->mapAdapter->getTrafficData($originalRoute);
        $currentDuration = $trafficData->currentDuration;

        // Update session with current duration
        $session->updateDuration($currentDuration);

        // Calculate time change percentage
        $timeChangePercent = $session->getTimeChangePercent();

        // Check if recalculation is needed
        if ($timeChangePercent <= self::SIGNIFICANT_TIME_INCREASE_THRESHOLD * 100) {
            // No significant change, return original route
            $originalAnalysis = $this->analyzeRouteRisk($originalRoute);
            $originalWithRisk = $this->buildRouteWithRisk($originalRoute, $originalAnalysis);

            return new RouteRecalculationResult(
                originalRoute: $originalWithRisk,
                newRoute: null,
                routeChanged: false,
                riskChanged: false,
                timeChangePercent: $timeChangePercent,
                message: null,
            );
        }

        // Recalculate route from current position
        $newRoute = $this->mapAdapter->calculateRoute(
            $currentPosition,
            $originalRoute->destination
        );

        $originalAnalysis = $this->analyzeRouteRisk($originalRoute);
        $newAnalysis = $this->analyzeRouteRisk($newRoute);

        $originalWithRisk = $this->buildRouteWithRisk($originalRoute, $originalAnalysis);
        $newWithRisk = $this->buildRouteWithRisk($newRoute, $newAnalysis);

        // Check if risk changed
        $riskChanged = abs($newAnalysis->maxRiskIndex - $originalAnalysis->maxRiskIndex) >= 5;

        // Update session with new risk
        $session->updateMaxRiskIndex($newAnalysis->maxRiskIndex);

        // Build message
        $message = $this->buildRecalculationMessage(
            $timeChangePercent,
            $riskChanged,
            $originalAnalysis->maxRiskIndex,
            $newAnalysis->maxRiskIndex
        );

        return new RouteRecalculationResult(
            originalRoute: $originalWithRisk,
            newRoute: $newWithRisk,
            routeChanged: true,
            riskChanged: $riskChanged,
            timeChangePercent: $timeChangePercent,
            message: $message,
        );
    }

    /**
     * Start a new navigation session.
     *
     * @param RouteWithRisk $route The route to navigate
     * @param int|null $userId Optional user ID
     * @return NavigationSession The created session
     */
    public function startNavigationSession(
        RouteWithRisk $route,
        ?int $userId = null
    ): NavigationSession {
        return NavigationSession::create([
            'user_id' => $userId,
            'route_data' => $route->route->toArray(),
            'current_position' => $route->route->origin->toArray(),
            'original_duration' => $route->route->duration,
            'current_duration' => $route->route->duration,
            'max_risk_index' => $route->maxRiskIndex,
            'started_at' => now(),
            'last_updated_at' => now(),
            'status' => NavigationSession::STATUS_ACTIVE,
        ]);
    }

    /**
     * Get waypoints from a route for risk analysis.
     *
     * @param Route $route The route
     * @return Coordinates[] Array of coordinates along the route
     */
    private function getRouteWaypoints(Route $route): array
    {
        $waypoints = [$route->origin];

        foreach ($route->waypoints as $waypoint) {
            $waypoints[] = $waypoint;
        }

        $waypoints[] = $route->destination;

        return $waypoints;
    }

    /**
     * Build a RouteWithRisk from route and analysis.
     */
    private function buildRouteWithRisk(Route $route, RouteRiskAnalysis $analysis): RouteWithRisk
    {
        return new RouteWithRisk(
            route: $route,
            maxRiskIndex: $analysis->maxRiskIndex,
            averageRiskIndex: $analysis->averageRiskIndex,
            riskRegions: $analysis->riskRegions,
            requiresWarning: $analysis->requiresWarning,
            warningMessage: $analysis->warningMessage,
        );
    }

    /**
     * Build a warning message for high-risk routes.
     *
     * @see Requirement 2.6 - Display preventive warning with risk level
     */
    private function buildWarningMessage(float $riskIndex, ?string $crimeType): string
    {
        $riskLevel = match (true) {
            $riskIndex >= 70 => __('messages.risk_level.high'),
            $riskIndex >= 50 => __('messages.risk_level.moderate'),
            default => __('messages.risk_level.low'),
        };

        if ($crimeType) {
            return __('messages.route_warning_with_crime', [
                'risk_level' => $riskLevel,
                'crime_type' => $crimeType,
            ]);
        }

        return __('messages.route_warning', [
            'risk_level' => $riskLevel,
        ]);
    }

    /**
     * Build a message for route recalculation.
     */
    private function buildRecalculationMessage(
        float $timeChangePercent,
        bool $riskChanged,
        float $originalRisk,
        float $newRisk
    ): string {
        $messages = [];

        $messages[] = __('messages.route_recalculated', [
            'time_change' => round($timeChangePercent, 1),
        ]);

        if ($riskChanged) {
            if ($newRisk > $originalRisk) {
                $messages[] = __('messages.risk_increased', [
                    'old_risk' => round($originalRisk),
                    'new_risk' => round($newRisk),
                ]);
            } else {
                $messages[] = __('messages.risk_decreased', [
                    'old_risk' => round($originalRisk),
                    'new_risk' => round($newRisk),
                ]);
            }
        }

        return implode(' ', $messages);
    }

    /**
     * Get route options for safe route calculation.
     */
    public function getSafeRouteOptions(): RouteOptions
    {
        return new RouteOptions(
            preferSafeRoute: true,
        );
    }

    /**
     * Compare two routes and determine which is safer.
     *
     * @param RouteWithRisk $route1 First route
     * @param RouteWithRisk $route2 Second route
     * @return int -1 if route1 is safer, 1 if route2 is safer, 0 if equal
     */
    public function compareRouteSafety(RouteWithRisk $route1, RouteWithRisk $route2): int
    {
        // Primary: lower max risk
        $riskDiff = $route1->maxRiskIndex <=> $route2->maxRiskIndex;
        if ($riskDiff !== 0) {
            return $riskDiff;
        }

        // Secondary: lower average risk
        return $route1->averageRiskIndex <=> $route2->averageRiskIndex;
    }

    /**
     * Get occurrences along a route within a buffer distance.
     *
     * @param Route $route The route
     * @param float $bufferMeters Buffer distance in meters (default 200m)
     * @return \Illuminate\Support\Collection Collection of occurrences
     */
    public function getOccurrencesAlongRoute(Route $route, float $bufferMeters = 200): \Illuminate\Support\Collection
    {
        $waypoints = $this->getRouteWaypoints($route);
        
        if (count($waypoints) < 2) {
            return collect();
        }

        // Build a LineString from the route waypoints
        $lineCoords = array_map(
            fn(Coordinates $c) => "{$c->longitude} {$c->latitude}",
            $waypoints
        );
        $lineWkt = 'LINESTRING(' . implode(', ', $lineCoords) . ')';

        // Convert buffer from meters to degrees (approximate)
        // At equator: 1 degree ≈ 111km, so 200m ≈ 0.0018 degrees
        $bufferDegrees = $bufferMeters / 111000;

        // Query occurrences within buffer of the route line
        $occurrences = Occurrence::query()
            ->active()
            ->withinDays(30) // Only recent occurrences
            ->whereRaw(
                "ST_DWithin(location::geography, ST_GeomFromText(?, 4326)::geography, ?)",
                [$lineWkt, $bufferMeters]
            )
            ->with('crimeType.category')
            ->orderBy('timestamp', 'desc')
            ->get();

        return $occurrences;
    }
}
