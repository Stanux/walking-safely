<?php

namespace App\Services;

use App\Models\AlertPreference;
use App\Models\RiskIndex;
use App\ValueObjects\Coordinates;

/**
 * Service for managing alerts during navigation.
 *
 * @see Requirement 6.1 - Alert when entering high risk region
 * @see Requirement 6.4 - Alert distance based on speed
 */
class AlertService
{
    /**
     * Minimum distance for alert in meters.
     */
    public const MIN_ALERT_DISTANCE = 200;

    /**
     * Default alert distance in meters.
     */
    public const DEFAULT_ALERT_DISTANCE = 500;

    /**
     * Speed threshold for extended alert distance (km/h).
     */
    public const SPEED_THRESHOLD_KMH = 40;

    /**
     * Alert distance for high speed in meters.
     * Requirement 6.4: At least 500m when speed > 40 km/h.
     */
    public const HIGH_SPEED_ALERT_DISTANCE = 500;

    public function __construct(
        private RiskService $riskService
    ) {}

    /**
     * Check alert conditions for a user at a given position.
     *
     * @param Coordinates $position Current user position
     * @param float $speed Current speed in km/h
     * @param AlertPreference|null $userPreferences User's alert preferences
     * @return array Array of alerts to display
     *
     * @see Requirement 6.1 - Alert when entering high risk region (>= 70)
     */
    public function checkAlertConditions(
        Coordinates $position,
        float $speed,
        ?AlertPreference $userPreferences = null
    ): array {
        $alerts = [];

        // Calculate alert distance based on speed
        $alertDistance = $this->calculateAlertDistance($speed);

        // Get risk index for current position
        $currentRisk = $this->riskService->getRiskForCoordinates($position);

        // Check if we're in or approaching a high risk region
        if ($currentRisk && $currentRisk->isHighRisk()) {
            // Check if alert should be shown based on preferences
            if ($this->shouldShowAlert($currentRisk, $userPreferences)) {
                $alerts[] = $this->createHighRiskAlert($currentRisk, $position);
            }
        }

        return $alerts;
    }

    /**
     * Check for approaching high risk regions along a route.
     *
     * @param Coordinates $position Current user position
     * @param float $speed Current speed in km/h
     * @param array $upcomingWaypoints Upcoming waypoints on the route
     * @param AlertPreference|null $userPreferences User's alert preferences
     * @return array Array of approaching alerts
     */
    public function checkApproachingAlerts(
        Coordinates $position,
        float $speed,
        array $upcomingWaypoints,
        ?AlertPreference $userPreferences = null
    ): array {
        $alerts = [];
        $alertDistance = $this->calculateAlertDistance($speed);

        // Get current region to avoid duplicate alerts
        $currentRisk = $this->riskService->getRiskForCoordinates($position);
        $currentRegionId = $currentRisk?->region_id;

        // Check upcoming waypoints for high risk regions
        foreach ($upcomingWaypoints as $waypoint) {
            $distance = $position->distanceTo($waypoint);

            // Only check waypoints within alert distance
            if ($distance > $alertDistance) {
                continue;
            }

            $waypointRisk = $this->riskService->getRiskForCoordinates($waypoint);

            if ($waypointRisk && $waypointRisk->isHighRisk()) {
                // Skip if same region as current position
                if ($waypointRisk->region_id === $currentRegionId) {
                    continue;
                }

                if ($this->shouldShowAlert($waypointRisk, $userPreferences)) {
                    $alerts[] = $this->createApproachingHighRiskAlert(
                        $waypointRisk,
                        $position,
                        $distance
                    );
                }
            }
        }

        return $alerts;
    }

    /**
     * Calculate the alert distance based on current speed.
     *
     * @param float $speed Speed in km/h
     * @return float Alert distance in meters
     *
     * @see Requirement 6.4 - At least 500m when speed > 40 km/h
     */
    public function calculateAlertDistance(float $speed): float
    {
        // Ensure speed is non-negative
        $speed = max(0, $speed);

        // For speeds above threshold, use at least 500m
        if ($speed > self::SPEED_THRESHOLD_KMH) {
            // Scale distance with speed for higher speeds
            // Base: 500m at 40 km/h, increases proportionally
            $scaleFactor = $speed / self::SPEED_THRESHOLD_KMH;
            return max(self::HIGH_SPEED_ALERT_DISTANCE, self::HIGH_SPEED_ALERT_DISTANCE * $scaleFactor);
        }

        // For lower speeds, scale down from default
        if ($speed > 0) {
            $scaleFactor = $speed / self::SPEED_THRESHOLD_KMH;
            return max(self::MIN_ALERT_DISTANCE, self::DEFAULT_ALERT_DISTANCE * $scaleFactor);
        }

        // Stationary or very slow - use minimum distance
        return self::MIN_ALERT_DISTANCE;
    }

    /**
     * Check if an alert should be shown based on user preferences.
     *
     * @param RiskIndex $riskIndex The risk index to check
     * @param AlertPreference|null $preferences User's alert preferences
     * @return bool
     *
     * @see Requirement 6.3 - Filter alerts by type
     * @see Requirement 6.5 - Filter alerts by time
     */
    private function shouldShowAlert(RiskIndex $riskIndex, ?AlertPreference $preferences): bool
    {
        // If no preferences, show all alerts
        if ($preferences === null) {
            return true;
        }

        // Check if alerts are enabled
        if (!$preferences->alerts_enabled) {
            return false;
        }

        // Check time-based filtering
        if (!$preferences->isActiveAtCurrentTime()) {
            return false;
        }

        // Check crime type filtering
        if ($riskIndex->dominant_crime_type_id !== null) {
            if (!$preferences->isCrimeTypeEnabled($riskIndex->dominant_crime_type_id)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Create an alert for being in a high risk region.
     *
     * @param RiskIndex $riskIndex The risk index
     * @param Coordinates $position Current position
     * @return array
     */
    private function createHighRiskAlert(RiskIndex $riskIndex, Coordinates $position): array
    {
        return [
            'type' => 'high_risk_region',
            'severity' => 'high',
            'risk_index' => $riskIndex->value,
            'region_id' => $riskIndex->region_id,
            'dominant_crime_type_id' => $riskIndex->dominant_crime_type_id,
            'position' => $position->toArray(),
            'message_key' => 'alerts.high_risk_region',
            'requires_visual' => true,
            'requires_sound' => true,
        ];
    }

    /**
     * Create an alert for approaching a high risk region.
     *
     * @param RiskIndex $riskIndex The risk index
     * @param Coordinates $position Current position
     * @param float $alertDistance Distance at which alert was triggered
     * @return array
     */
    private function createApproachingHighRiskAlert(
        RiskIndex $riskIndex,
        Coordinates $position,
        float $alertDistance
    ): array {
        return [
            'type' => 'approaching_high_risk',
            'severity' => 'warning',
            'risk_index' => $riskIndex->value,
            'region_id' => $riskIndex->region_id,
            'dominant_crime_type_id' => $riskIndex->dominant_crime_type_id,
            'position' => $position->toArray(),
            'alert_distance' => $alertDistance,
            'message_key' => 'alerts.approaching_high_risk',
            'requires_visual' => true,
            'requires_sound' => true,
        ];
    }

    /**
     * Get alert preferences for a user.
     *
     * @param int $userId
     * @return AlertPreference|null
     */
    public function getUserAlertPreferences(int $userId): ?AlertPreference
    {
        return AlertPreference::where('user_id', $userId)->first();
    }

    /**
     * Update alert preferences for a user.
     *
     * @param int $userId
     * @param array $preferences
     * @return AlertPreference
     */
    public function updateAlertPreferences(int $userId, array $preferences): AlertPreference
    {
        return AlertPreference::updateOrCreate(
            ['user_id' => $userId],
            $preferences
        );
    }

    /**
     * Create default alert preferences for a user.
     *
     * @param int $userId
     * @return AlertPreference
     */
    public function createDefaultPreferences(int $userId): AlertPreference
    {
        return AlertPreference::create([
            'user_id' => $userId,
            'alerts_enabled' => true,
            'enabled_crime_types' => [], // Empty means all enabled
            'active_hours_start' => null, // Null means always active
            'active_hours_end' => null,
            'active_days' => [], // Empty means all days
        ]);
    }
}
