<?php

namespace App\Http\Middleware;

use App\Services\LocationPermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to verify user has granted location permission.
 *
 * @see Requirement 15.1 - Use location data only during active session
 */
class VerifyLocationPermission
{
    /**
     * Create a new middleware instance.
     */
    public function __construct(
        protected LocationPermissionService $locationPermissionService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'authentication_required',
                'message' => __('messages.authentication_required'),
            ], 401);
        }

        if (!$this->locationPermissionService->hasPermission($user)) {
            return response()->json([
                'error' => 'location_permission_required',
                'message' => __('messages.location_permission_required'),
                'translation_key' => 'messages.location_permission_required',
            ], 403);
        }

        return $next($request);
    }
}
