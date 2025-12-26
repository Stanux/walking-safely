<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\NavigationSession;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Service for managing user location permissions and data.
 *
 * @see Requirement 15.1 - Use location data only during active session
 * @see Requirement 15.3 - Clear location data on permission revocation
 */
class LocationPermissionService
{
    /**
     * Cache key prefix for user location data.
     */
    public const LOCATION_CACHE_PREFIX = 'user_location:';

    /**
     * Cache key prefix for user route data.
     */
    public const ROUTE_CACHE_PREFIX = 'user_route:';

    /**
     * Cache key prefix for user geocoding data.
     */
    public const GEOCODING_CACHE_PREFIX = 'user_geocoding:';

    /**
     * Grant location permission to a user.
     */
    public function grantPermission(User $user): void
    {
        $user->location_permission_granted = true;
        $user->location_permission_granted_at = now();
        $user->location_permission_revoked_at = null;
        $user->save();

        $this->logPermissionChange($user, 'granted');
    }

    /**
     * Revoke location permission from a user and clear all cached location data.
     */
    public function revokePermission(User $user): void
    {
        $user->location_permission_granted = false;
        $user->location_permission_revoked_at = now();
        $user->save();

        // Clear all location-related cached data for this user
        $this->clearUserLocationCache($user);

        // Cancel any active navigation sessions
        $this->cancelActiveNavigationSessions($user);

        $this->logPermissionChange($user, 'revoked');
    }

    /**
     * Check if a user has granted location permission.
     */
    public function hasPermission(User $user): bool
    {
        return $user->location_permission_granted === true;
    }

    /**
     * Clear all location-related cached data for a user.
     *
     * @see Requirement 15.3 - Clear location data on permission revocation
     */
    public function clearUserLocationCache(User $user): void
    {
        $userId = $user->id;

        // Clear location cache
        Cache::forget(self::LOCATION_CACHE_PREFIX . $userId);

        // Clear route cache
        Cache::forget(self::ROUTE_CACHE_PREFIX . $userId);

        // Clear geocoding cache for user
        Cache::forget(self::GEOCODING_CACHE_PREFIX . $userId);

        // Clear any pattern-based cache keys
        $this->clearPatternBasedCache($userId);

        Log::info('Cleared location cache for user', ['user_id' => $userId]);
    }

    /**
     * Clear pattern-based cache keys for a user.
     */
    protected function clearPatternBasedCache(int $userId): void
    {
        // Clear navigation session cache
        Cache::forget("navigation_session:{$userId}");

        // Clear recent locations cache
        Cache::forget("recent_locations:{$userId}");

        // Clear route history cache
        Cache::forget("route_history:{$userId}");

        // Clear alert position cache
        Cache::forget("alert_position:{$userId}");
    }

    /**
     * Cancel all active navigation sessions for a user.
     */
    protected function cancelActiveNavigationSessions(User $user): void
    {
        NavigationSession::where('user_id', $user->id)
            ->where('status', NavigationSession::STATUS_ACTIVE)
            ->update([
                'status' => NavigationSession::STATUS_CANCELLED,
                'updated_at' => now(),
            ]);
    }

    /**
     * Log permission change to audit log.
     */
    protected function logPermissionChange(User $user, string $action): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'action' => "location_permission_{$action}",
            'target_type' => User::class,
            'target_id' => $user->id,
            'details' => [
                'action' => $action,
                'timestamp' => now()->toIso8601String(),
            ],
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Store user location in cache (only if permission granted).
     *
     * @see Requirement 15.1 - Use location data only during active session
     */
    public function cacheUserLocation(User $user, array $location, int $ttlSeconds = 300): bool
    {
        if (!$this->hasPermission($user)) {
            return false;
        }

        Cache::put(
            self::LOCATION_CACHE_PREFIX . $user->id,
            $location,
            $ttlSeconds
        );

        return true;
    }

    /**
     * Get cached user location.
     */
    public function getCachedUserLocation(User $user): ?array
    {
        if (!$this->hasPermission($user)) {
            return null;
        }

        return Cache::get(self::LOCATION_CACHE_PREFIX . $user->id);
    }
}
