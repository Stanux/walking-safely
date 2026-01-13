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
     * @OA\Get(
     *     path="/heatmap",
     *     operationId="getHeatmap",
     *     tags={"Heatmap"},
     *     summary="Obter dados do mapa de calor",
     *     description="Retorna dados de concentração de ocorrências para renderização de mapa de calor. Granularidade ajusta automaticamente com o zoom.",
     *     @OA\Parameter(
     *         name="min_lat",
     *         in="query",
     *         required=true,
     *         description="Latitude mínima do bounding box",
     *         @OA\Schema(type="number", format="float", example=-23.6)
     *     ),
     *     @OA\Parameter(
     *         name="min_lng",
     *         in="query",
     *         required=true,
     *         description="Longitude mínima do bounding box",
     *         @OA\Schema(type="number", format="float", example=-46.7)
     *     ),
     *     @OA\Parameter(
     *         name="max_lat",
     *         in="query",
     *         required=true,
     *         description="Latitude máxima do bounding box",
     *         @OA\Schema(type="number", format="float", example=-23.5)
     *     ),
     *     @OA\Parameter(
     *         name="max_lng",
     *         in="query",
     *         required=true,
     *         description="Longitude máxima do bounding box",
     *         @OA\Schema(type="number", format="float", example=-46.6)
     *     ),
     *     @OA\Parameter(
     *         name="zoom",
     *         in="query",
     *         description="Nível de zoom do mapa (1-18)",
     *         @OA\Schema(type="integer", minimum=1, maximum=18, example=12)
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
     *     @OA\Response(
     *         response=200,
     *         description="Dados do mapa de calor",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/HeatmapPoint")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     )
     * )
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
     * @OA\Get(
     *     path="/heatmap/regions",
     *     operationId="getHeatmapByRegion",
     *     tags={"Heatmap"},
     *     summary="Mapa de calor por região",
     *     description="Retorna dados de ocorrências agregados por região administrativa",
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
     *     @OA\Response(
     *         response=200,
     *         description="Dados agregados por região",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/RegionHeatmap")
     *             )
     *         )
     *     )
     * )
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
     * @OA\Get(
     *     path="/heatmap/distribution",
     *     operationId="getDistribution",
     *     tags={"Heatmap"},
     *     summary="Distribuição por tipo de crime",
     *     description="Retorna a distribuição de ocorrências por tipo de crime",
     *     @OA\Parameter(
     *         name="min_lat",
     *         in="query",
     *         description="Latitude mínima do bounding box",
     *         @OA\Schema(type="number", format="float")
     *     ),
     *     @OA\Parameter(
     *         name="min_lng",
     *         in="query",
     *         description="Longitude mínima do bounding box",
     *         @OA\Schema(type="number", format="float")
     *     ),
     *     @OA\Parameter(
     *         name="max_lat",
     *         in="query",
     *         description="Latitude máxima do bounding box",
     *         @OA\Schema(type="number", format="float")
     *     ),
     *     @OA\Parameter(
     *         name="max_lng",
     *         in="query",
     *         description="Longitude máxima do bounding box",
     *         @OA\Schema(type="number", format="float")
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
     *         description="Distribuição por tipo de crime",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/CrimeDistribution")
     *             )
     *         )
     *     )
     * )
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
