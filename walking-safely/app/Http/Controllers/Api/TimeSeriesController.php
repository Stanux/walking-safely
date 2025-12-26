<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TimeSeriesRequest;
use App\Services\TimeSeriesService;
use Illuminate\Http\JsonResponse;

/**
 * Controller for time series visualization.
 *
 * @see Requirement 11.1 - Display line chart showing occurrence count by period
 * @see Requirement 11.2 - Filter by region and crime type
 */
class TimeSeriesController extends Controller
{
    public function __construct(
        private TimeSeriesService $timeSeriesService
    ) {}

    /**
     * Get time series data for occurrences.
     *
     * GET /api/timeseries
     *
     * @see Requirement 11.1 - Display line chart showing occurrence count by period
     * @see Requirement 11.2 - Filter by region and crime type
     * @see Requirement 11.3 - Select temporal granularity
     */
    public function index(TimeSeriesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filters = [];

        if (isset($validated['region_id'])) {
            $filters['region_id'] = $validated['region_id'];
        }

        if (isset($validated['region_ids'])) {
            $filters['region_ids'] = $validated['region_ids'];
        }

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

        $granularity = $validated['granularity'] ?? TimeSeriesService::GRANULARITY_DAY;

        $data = $this->timeSeriesService->getTimeSeries($filters, $granularity);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Get hourly pattern analysis.
     *
     * GET /api/timeseries/hourly
     *
     * @see Requirement 11.4 - Show concentration by hour of day
     */
    public function hourlyPattern(TimeSeriesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filters = $this->buildFilters($validated);

        $data = $this->timeSeriesService->getHourlyPattern($filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Get day of week pattern analysis.
     *
     * GET /api/timeseries/daily
     *
     * @see Requirement 11.4 - Show concentration by day of week
     */
    public function dayOfWeekPattern(TimeSeriesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filters = $this->buildFilters($validated);

        $data = $this->timeSeriesService->getDayOfWeekPattern($filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Get combined hour and day of week heatmap.
     *
     * GET /api/timeseries/heatmap
     *
     * @see Requirement 11.4 - Show concentration by hour of day and day of week
     */
    public function hourDayHeatmap(TimeSeriesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filters = $this->buildFilters($validated);

        $data = $this->timeSeriesService->getHourDayHeatmap($filters);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Build filters array from validated request data.
     */
    private function buildFilters(array $validated): array
    {
        $filters = [];

        if (isset($validated['region_id'])) {
            $filters['region_id'] = $validated['region_id'];
        }

        if (isset($validated['region_ids'])) {
            $filters['region_ids'] = $validated['region_ids'];
        }

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

        return $filters;
    }
}
