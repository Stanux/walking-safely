<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOccurrenceRequest;
use App\Http\Requests\ListOccurrencesRequest;
use App\Http\Resources\OccurrenceResource;
use App\Http\Resources\OccurrenceCollection;
use App\Models\Occurrence;
use App\Services\OccurrenceService;
use App\ValueObjects\Coordinates;
use Illuminate\Http\JsonResponse;

/**
 * Controller for occurrence management.
 *
 * @see Requirement 7.1 - Store occurrences with timestamp, GPS coordinates, crime type, and severity
 * @see Requirement 7.2 - Validate GPS coordinates within 100 meters of user location
 * @see Requirement 7.5 - Limit each user to 5 reports per hour
 */
class OccurrenceController extends Controller
{
    public function __construct(
        private OccurrenceService $occurrenceService
    ) {}

    /**
     * List occurrences with optional filters.
     *
     * GET /api/occurrences
     */
    public function index(ListOccurrencesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $query = Occurrence::query()->active();

        // Filter by region
        if (isset($validated['region_id'])) {
            $query->inRegion($validated['region_id']);
        }

        // Filter by crime type
        if (isset($validated['crime_type_id'])) {
            $query->byCrimeType($validated['crime_type_id']);
        }

        // Filter by severity
        if (isset($validated['severity'])) {
            $query->where('severity', $validated['severity']);
        }

        // Filter by date range
        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $query->inDateRange($validated['start_date'], $validated['end_date']);
        }

        // Filter by days
        if (isset($validated['days'])) {
            $query->withinDays($validated['days']);
        }

        // Filter by location proximity
        if (isset($validated['latitude']) && isset($validated['longitude'])) {
            $coordinates = new Coordinates(
                $validated['latitude'],
                $validated['longitude']
            );
            $radius = $validated['radius'] ?? 1000; // Default 1km radius
            $query->nearPoint($coordinates->toPoint(), $radius);
        }

        $occurrences = $query->orderBy('timestamp', 'desc')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json(new OccurrenceCollection($occurrences));
    }

    /**
     * Create a new occurrence.
     *
     * POST /api/occurrences
     *
     * @see Requirement 7.1 - Store occurrence with required fields
     * @see Requirement 7.2 - Validate location proximity
     * @see Requirement 7.5 - Rate limiting
     */
    public function store(CreateOccurrenceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $userLocation = new Coordinates(
            $validated['user_location']['latitude'],
            $validated['user_location']['longitude']
        );

        try {
            $occurrence = $this->occurrenceService->createOccurrence(
                [
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude'],
                    'crime_type_id' => $validated['crime_type_id'],
                    'severity' => $validated['severity'],
                    'timestamp' => $validated['timestamp'] ?? now(),
                    'source' => 'collaborative',
                    'created_by' => $request->user()?->id,
                    'metadata' => $validated['metadata'] ?? null,
                ],
                $userLocation
            );

            // Record the submission for rate limiting
            if ($request->user()) {
                $this->occurrenceService->recordUserSubmission($request->user()->id);
            }

            return response()->json([
                'data' => new OccurrenceResource($occurrence),
                'message' => __('messages.occurrence_created'),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'validation_error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => 'rate_limit_exceeded',
                'message' => $e->getMessage(),
            ], 429);
        }
    }

    /**
     * Get a specific occurrence.
     *
     * GET /api/occurrences/{id}
     */
    public function show(int $id): JsonResponse
    {
        $occurrence = $this->occurrenceService->getOccurrence($id);

        if (!$occurrence) {
            return response()->json([
                'error' => 'not_found',
                'message' => __('messages.occurrence_not_found'),
            ], 404);
        }

        return response()->json([
            'data' => new OccurrenceResource($occurrence),
        ]);
    }
}
