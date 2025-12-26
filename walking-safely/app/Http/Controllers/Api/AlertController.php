<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckAlertsRequest;
use App\Http\Requests\UpdateAlertPreferencesRequest;
use App\Http\Resources\AlertPreferenceResource;
use App\Services\AlertService;
use App\ValueObjects\Coordinates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller for alert management.
 *
 * @see Requirement 6.1 - Alert when entering high risk region
 * @see Requirement 6.3 - Enable/disable alerts by occurrence type
 */
class AlertController extends Controller
{
    public function __construct(
        private AlertService $alertService
    ) {}

    /**
     * Check alert conditions for current position.
     *
     * GET /api/alerts/check
     *
     * @see Requirement 6.1 - Alert when entering high risk region
     * @see Requirement 6.4 - Alert distance based on speed
     */
    public function check(CheckAlertsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $position = new Coordinates(
            $validated['latitude'],
            $validated['longitude']
        );

        $speed = $validated['speed'] ?? 0;

        // Get user preferences if authenticated
        $preferences = null;
        if ($request->user()) {
            $preferences = $this->alertService->getUserAlertPreferences($request->user()->id);
        }

        // Check for alerts at current position
        $alerts = $this->alertService->checkAlertConditions(
            $position,
            $speed,
            $preferences
        );

        // Check for approaching alerts if waypoints provided
        if (isset($validated['upcoming_waypoints']) && !empty($validated['upcoming_waypoints'])) {
            $waypoints = array_map(
                fn($wp) => new Coordinates($wp['latitude'], $wp['longitude']),
                $validated['upcoming_waypoints']
            );

            $approachingAlerts = $this->alertService->checkApproachingAlerts(
                $position,
                $speed,
                $waypoints,
                $preferences
            );

            $alerts = array_merge($alerts, $approachingAlerts);
        }

        return response()->json([
            'data' => [
                'alerts' => $alerts,
                'alert_distance' => $this->alertService->calculateAlertDistance($speed),
            ],
        ]);
    }

    /**
     * Get user's alert preferences.
     *
     * GET /api/alerts/preferences
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        $preferences = $this->alertService->getUserAlertPreferences($user->id);

        if (!$preferences) {
            // Create default preferences if none exist
            $preferences = $this->alertService->createDefaultPreferences($user->id);
        }

        return response()->json([
            'data' => new AlertPreferenceResource($preferences),
        ]);
    }

    /**
     * Update user's alert preferences.
     *
     * PUT /api/alerts/preferences
     *
     * @see Requirement 6.3 - Enable/disable alerts by occurrence type
     * @see Requirement 6.5 - Define specific hours for alert activation
     */
    public function updatePreferences(UpdateAlertPreferencesRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        $validated = $request->validated();

        $preferences = $this->alertService->updateAlertPreferences(
            $user->id,
            $validated
        );

        return response()->json([
            'data' => new AlertPreferenceResource($preferences),
            'message' => __('messages.preferences_updated'),
        ]);
    }
}
