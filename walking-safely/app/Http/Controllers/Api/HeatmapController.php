<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\HeatmapRequest;
use App\Services\HeatmapService;
use Illuminate\Http\JsonResponse;

/**
 * Controller for heatmap visualization.
 *
 * @see Requirement 10.1 - Render heatmap layer showing occurrence concentration
 * @see Requirement 10.2 - Filter by crime type and time period
 */
class HeatmapController extends Controller
{
    public function __construct(
        private HeatmapService $heatmapService
    ) {}

    /**
     * Get heatmap data for a given bounding box.
     *
     * GET /api/heatmap
     *
     * @see Requirement 10.1 - Render heatmap layer
     * @see Requirement 10.2 - Filter by crime type and time period
     * @see Requirement 10.3 - Adjust granularity based on zoom level
     */
    public function index(HeatmapRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Validate that bounds are provided for this endpoint
        if (!isset($validated['min_lat'], $validated['min_lng'], $validated['max_lat'], $validated['max_lng'])) {
            return response()->json([
                'message' => 'Bounding box parameters are required.',
                'errors' => [
                    'min_lat' => ['The min_lat field is required.'],
                    'min_lng' => ['The min_lng field is required.'],
                    'max_lat' => ['The max_lat field is required.'],
                    'max_lng' => ['The max_lng field is required.'],
                ],
            ], 422);
        }

        // Build bounds array
        $bounds = [
            $validated['min_lat'],
            $validated['min_lng'],
            $validated['max_lat'],
            $validated['max_lng'],
        ];

        // Build filters
        $filters = [];

        if (isset($validated['crime_type_id'])) {
            $filters['crime_type_id'] = $validated['crime_type_id'];
        }

        if (isset($validated['crime_category_id'])) {
            $filters['crime_category_id'] = $validated['crime_category_id'];
        }

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $filters['start_date'] = $validated['start_date'];
            $filters['end_date'] = $validated['end_date'];
        } elseif (isset($validated['days'])) {
            $filters['days'] = $validated['days'];
        }

        $zoom = $validated['zoom'] ?? 10;

        $data = $this->heatmapService->getHeatmapData($bounds, $filters, $zoom);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Get heatmap data aggregated by region.
     *
     * GET /api/heatmap/regions
     */
    public function byRegion(HeatmapRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filters = [];

        if (isset($validated['crime_type_id'])) {
            $filters['crime_type_id'] = $validated['crime_type_id'];
        }

        if (isset($validated['crime_category_id'])) {
            $filters['crime_category_id'] = $validated['crime_category_id'];
        }

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $filters['start_date'] = $validated['start_date'];
            $filters['end_date'] = $validated['end_date'];
        } elseif (isset($validated['days'])) {
            $filters['days'] = $validated['days'];
        }

        $data = $this->heatmapService->getHeatmapByRegion($filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Get occurrence distribution by crime type.
     *
     * GET /api/heatmap/distribution
     */
    public function distribution(HeatmapRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $bounds = [];
        if (isset($validated['min_lat'], $validated['min_lng'], $validated['max_lat'], $validated['max_lng'])) {
            $bounds = [
                $validated['min_lat'],
                $validated['min_lng'],
                $validated['max_lat'],
                $validated['max_lng'],
            ];
        }

        $filters = [];

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $filters['start_date'] = $validated['start_date'];
            $filters['end_date'] = $validated['end_date'];
        } elseif (isset($validated['days'])) {
            $filters['days'] = $validated['days'];
        }

        $data = $this->heatmapService->getDistributionByCrimeType($bounds, $filters);

        return response()->json([
            'data' => $data,
        ]);
    }
}
