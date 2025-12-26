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
     * GET /api/analytics/dashboard
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
     * GET /api/analytics/summary
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
     * GET /api/analytics/distribution/type
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
     * GET /api/analytics/distribution/region
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
     * GET /api/analytics/trends
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
     * GET /api/analytics/quality
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
     * GET /api/analytics/moderation
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
     * GET /api/analytics/export
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
