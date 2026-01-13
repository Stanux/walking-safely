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
     * @OA\Get(
     *     path="/timeseries",
     *     operationId="getTimeSeries",
     *     tags={"TimeSeries"},
     *     summary="Série temporal de ocorrências",
     *     description="Retorna dados de série temporal para visualização em gráfico de linha",
     *     @OA\Parameter(
     *         name="region_id",
     *         in="query",
     *         description="Filtrar por região",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="region_ids",
     *         in="query",
     *         description="Filtrar por múltiplas regiões",
     *         @OA\Schema(type="array", @OA\Items(type="integer"))
     *     ),
     *     @OA\Parameter(
     *         name="crime_type_id",
     *         in="query",
     *         description="Filtrar por tipo de crime",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="crime_category_id",
     *         in="query",
     *         description="Filtrar por categoria de crime",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Data inicial",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Data final",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="days",
     *         in="query",
     *         description="Últimos N dias",
     *         @OA\Schema(type="integer", minimum=1, maximum=365)
     *     ),
     *     @OA\Parameter(
     *         name="granularity",
     *         in="query",
     *         description="Granularidade temporal",
     *         @OA\Schema(type="string", enum={"hour", "day", "week", "month"})
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Dados da série temporal",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/TimeSeriesPoint")
     *             )
     *         )
     *     )
     * )
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
     * @OA\Get(
     *     path="/timeseries/hourly",
     *     operationId="getHourlyPattern",
     *     tags={"TimeSeries"},
     *     summary="Padrão por hora do dia",
     *     description="Retorna análise de concentração de ocorrências por hora do dia",
     *     @OA\Parameter(
     *         name="region_id",
     *         in="query",
     *         description="Filtrar por região",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="crime_type_id",
     *         in="query",
     *         description="Filtrar por tipo de crime",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Data inicial",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Data final",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="days",
     *         in="query",
     *         description="Últimos N dias",
     *         @OA\Schema(type="integer", minimum=1, maximum=365)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Padrão horário",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="hour", type="integer", example=14),
     *                     @OA\Property(property="count", type="integer", example=45)
     *                 )
     *             )
     *         )
     *     )
     * )
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
     * @OA\Get(
     *     path="/timeseries/daily",
     *     operationId="getDayOfWeekPattern",
     *     tags={"TimeSeries"},
     *     summary="Padrão por dia da semana",
     *     description="Retorna análise de concentração de ocorrências por dia da semana",
     *     @OA\Parameter(
     *         name="region_id",
     *         in="query",
     *         description="Filtrar por região",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="crime_type_id",
     *         in="query",
     *         description="Filtrar por tipo de crime",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Data inicial",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Data final",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="days",
     *         in="query",
     *         description="Últimos N dias",
     *         @OA\Schema(type="integer", minimum=1, maximum=365)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Padrão por dia da semana",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="day", type="integer", example=1, description="0=Domingo, 6=Sábado"),
     *                     @OA\Property(property="day_name", type="string", example="Segunda"),
     *                     @OA\Property(property="count", type="integer", example=120)
     *                 )
     *             )
     *         )
     *     )
     * )
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
     * @OA\Get(
     *     path="/timeseries/heatmap",
     *     operationId="getHourDayHeatmap",
     *     tags={"TimeSeries"},
     *     summary="Mapa de calor hora x dia",
     *     description="Retorna matriz de concentração combinando hora do dia e dia da semana",
     *     @OA\Parameter(
     *         name="region_id",
     *         in="query",
     *         description="Filtrar por região",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="crime_type_id",
     *         in="query",
     *         description="Filtrar por tipo de crime",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Data inicial",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Data final",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="days",
     *         in="query",
     *         description="Últimos N dias",
     *         @OA\Schema(type="integer", minimum=1, maximum=365)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Matriz hora x dia",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="hour", type="integer", example=14),
     *                     @OA\Property(property="day", type="integer", example=1),
     *                     @OA\Property(property="count", type="integer", example=25)
     *                 )
     *             )
     *         )
     *     )
     * )
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
