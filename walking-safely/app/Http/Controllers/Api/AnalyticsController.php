<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Controller for analytics and dashboard endpoints.
 *
 * @see Requirement 20.1 - Dashboard with management indicators
 * @see Requirement 20.2 - Data updated with maximum 15 minute delay
 * @see Requirement 20.3 - Export reports in CSV and PDF format
 * @see Requirement 20.4 - Data quality metrics
 */
class AnalyticsController extends Controller
{
    public function __construct(
        private AnalyticsService $analyticsService
    ) {}

    /**
     * Get dashboard data.
     *
     * @OA\Get(
     *     path="/analytics/dashboard",
     *     operationId="getDashboard",
     *     tags={"Analytics"},
     *     summary="Dashboard analítico",
     *     description="Retorna dados completos do dashboard com indicadores de gestão. Dados atualizados com delay máximo de 15 minutos.",
     *     security={{"bearerAuth":{}}},
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
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="region_id",
     *         in="query",
     *         description="Filtrar por região",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Dados do dashboard",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/DashboardData"),
     *             @OA\Property(property="filters", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Não autenticado",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Sem permissão de administrador",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     *
     * @see Requirement 20.1 - Dashboard with management indicators
     * @see Requirement 20.2 - Data updated with maximum 15 minute delay
     */
    public function dashboard(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getDashboardData($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get summary metrics only.
     *
     * @OA\Get(
     *     path="/analytics/summary",
     *     operationId="getSummary",
     *     tags={"Analytics"},
     *     summary="Métricas resumidas",
     *     description="Retorna apenas as métricas resumidas do sistema",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="days", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Métricas resumidas",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="total_occurrences", type="integer"),
     *                 @OA\Property(property="active_occurrences", type="integer"),
     *                 @OA\Property(property="pending_moderation", type="integer"),
     *                 @OA\Property(property="total_users", type="integer")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function summary(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getSummaryMetrics($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get distribution by crime type.
     *
     * @OA\Get(
     *     path="/analytics/distribution/type",
     *     operationId="getDistributionByType",
     *     tags={"Analytics"},
     *     summary="Distribuição por tipo de crime",
     *     description="Retorna distribuição de ocorrências por tipo de crime",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="days", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="region_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Distribuição por tipo",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/CrimeDistribution"))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function distributionByType(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getDistributionByCrimeType($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get distribution by region.
     *
     * @OA\Get(
     *     path="/analytics/distribution/region",
     *     operationId="getDistributionByRegion",
     *     tags={"Analytics"},
     *     summary="Distribuição por região",
     *     description="Retorna distribuição de ocorrências por região",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="days", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="crime_type_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Distribuição por região",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/RegionHeatmap"))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function distributionByRegion(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getDistributionByRegion($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get temporal trends.
     *
     * @OA\Get(
     *     path="/analytics/trends",
     *     operationId="getTrends",
     *     tags={"Analytics"},
     *     summary="Tendências temporais",
     *     description="Retorna análise de tendências temporais de ocorrências",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="days", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Dados de tendências",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/TimeSeriesPoint"))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function trends(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getTemporalTrends($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get data quality metrics.
     *
     * @OA\Get(
     *     path="/analytics/quality",
     *     operationId="getQuality",
     *     tags={"Analytics"},
     *     summary="Métricas de qualidade de dados",
     *     description="Retorna métricas de qualidade dos dados do sistema",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(
     *         response=200,
     *         description="Métricas de qualidade",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="completeness", type="number", format="float"),
     *                 @OA\Property(property="accuracy", type="number", format="float"),
     *                 @OA\Property(property="timeliness", type="number", format="float"),
     *                 @OA\Property(property="consistency", type="number", format="float")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     *
     * @see Requirement 20.4 - Data quality metrics
     */
    public function quality(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getDataQualityMetrics($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Get moderation statistics.
     *
     * @OA\Get(
     *     path="/analytics/moderation",
     *     operationId="getModerationStats",
     *     tags={"Analytics"},
     *     summary="Estatísticas de moderação",
     *     description="Retorna estatísticas do sistema de moderação",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(
     *         response=200,
     *         description="Estatísticas de moderação",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="pending", type="integer"),
     *                 @OA\Property(property="approved", type="integer"),
     *                 @OA\Property(property="rejected", type="integer"),
     *                 @OA\Property(property="avg_response_time", type="number")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function moderation(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $filters = $this->extractFilters($request);
        $data = $this->analyticsService->getModerationStatistics($filters);

        return response()->json([
            'data' => $data,
            'filters' => $filters,
        ]);
    }

    /**
     * Export analytics data.
     *
     * @OA\Get(
     *     path="/analytics/export",
     *     operationId="exportAnalytics",
     *     tags={"Analytics"},
     *     summary="Exportar dados analíticos",
     *     description="Exporta dados analíticos em formato CSV, PDF ou JSON",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="format",
     *         in="query",
     *         description="Formato de exportação",
     *         @OA\Schema(type="string", enum={"csv", "pdf", "json"}, default="csv")
     *     ),
     *     @OA\Parameter(
     *         name="type",
     *         in="query",
     *         description="Tipo de dados a exportar",
     *         @OA\Schema(type="string", enum={"occurrences", "summary", "distribution"}, default="occurrences")
     *     ),
     *     @OA\Parameter(name="start_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="end_date", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(
     *         response=200,
     *         description="Arquivo exportado",
     *         @OA\MediaType(
     *             mediaType="text/csv",
     *             @OA\Schema(type="string", format="binary")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     *
     * @see Requirement 20.3 - Export reports in CSV and PDF format
     */
    public function export(Request $request): Response|JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'format' => ['sometimes', 'string', 'in:csv,pdf,json'],
            'type' => ['sometimes', 'string', 'in:occurrences,summary,distribution'],
        ]);

        $filters = $this->extractFilters($request);
        $format = $request->input('format', 'csv');
        $type = $request->input('type', 'occurrences');

        return match ($format) {
            'csv' => $this->exportCsv($filters, $type),
            'pdf' => $this->exportPdf($filters),
            'json' => $this->exportJson($filters),
            default => $this->exportCsv($filters, $type),
        };
    }

    /**
     * Export as CSV.
     */
    protected function exportCsv(array $filters, string $type): Response
    {
        $csv = $this->analyticsService->exportToCsv($filters, $type);
        $filename = sprintf('walking-safely-%s-%s.csv', $type, now()->format('Y-m-d'));

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Export as PDF (returns data structure for PDF generation).
     */
    protected function exportPdf(array $filters): JsonResponse
    {
        $data = $this->analyticsService->exportToPdfData($filters);

        return response()->json([
            'data' => $data,
            'format' => 'pdf',
            'message' => __('messages.pdf_data_ready'),
        ]);
    }

    /**
     * Export as JSON.
     */
    protected function exportJson(array $filters): JsonResponse
    {
        $data = $this->analyticsService->getDashboardData($filters);
        $filename = sprintf('walking-safely-analytics-%s.json', now()->format('Y-m-d'));

        return response()->json([
            'data' => $data,
            'format' => 'json',
            'filename' => $filename,
        ]);
    }

    /**
     * Extract filters from request.
     */
    protected function extractFilters(Request $request): array
    {
        $filters = [];

        if ($request->has('start_date')) {
            $filters['start_date'] = $request->input('start_date');
        }

        if ($request->has('end_date')) {
            $filters['end_date'] = $request->input('end_date');
        }

        if ($request->has('days')) {
            $filters['days'] = (int) $request->input('days');
        }

        if ($request->has('region_id')) {
            $filters['region_id'] = (int) $request->input('region_id');
        }

        if ($request->has('crime_type_id')) {
            $filters['crime_type_id'] = (int) $request->input('crime_type_id');
        }

        if ($request->has('source')) {
            $filters['source'] = $request->input('source');
        }

        if ($request->has('status')) {
            $filters['status'] = $request->input('status');
        }

        return $filters;
    }

    /**
     * Authorize that the user has admin privileges.
     */
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();

        if (!$user || !$user->hasModeratorPrivileges()) {
            abort(403, __('messages.unauthorized'));
        }
    }
}
