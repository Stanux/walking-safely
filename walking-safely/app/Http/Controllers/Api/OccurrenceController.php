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
     * @OA\Get(
     *     path="/occurrences",
     *     operationId="listOccurrences",
     *     tags={"Occurrences"},
     *     summary="Listar ocorrências",
     *     description="Retorna lista paginada de ocorrências com filtros opcionais",
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
     *         name="severity",
     *         in="query",
     *         description="Filtrar por severidade",
     *         @OA\Schema(type="string", enum={"low", "medium", "high", "critical"})
     *     ),
     *     @OA\Parameter(
     *         name="start_date",
     *         in="query",
     *         description="Data inicial (YYYY-MM-DD)",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="end_date",
     *         in="query",
     *         description="Data final (YYYY-MM-DD)",
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="days",
     *         in="query",
     *         description="Últimos N dias",
     *         @OA\Schema(type="integer", minimum=1, maximum=365)
     *     ),
     *     @OA\Parameter(
     *         name="latitude",
     *         in="query",
     *         description="Latitude para busca por proximidade",
     *         @OA\Schema(type="number", format="float")
     *     ),
     *     @OA\Parameter(
     *         name="longitude",
     *         in="query",
     *         description="Longitude para busca por proximidade",
     *         @OA\Schema(type="number", format="float")
     *     ),
     *     @OA\Parameter(
     *         name="radius",
     *         in="query",
     *         description="Raio de busca em metros (padrão: 1000)",
     *         @OA\Schema(type="number", minimum=100, maximum=50000)
     *     ),
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Itens por página (padrão: 15)",
     *         @OA\Schema(type="integer", minimum=1, maximum=100)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lista de ocorrências",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/Occurrence")
     *             ),
     *             @OA\Property(property="meta", ref="#/components/schemas/PaginationMeta")
     *         )
     *     )
     * )
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
     * @OA\Post(
     *     path="/occurrences",
     *     operationId="createOccurrence",
     *     tags={"Occurrences"},
     *     summary="Criar ocorrência",
     *     description="Registra uma nova ocorrência criminal. Coordenadas devem estar a até 100m da localização do usuário. Limite de 5 reportes por hora por usuário.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"latitude", "longitude", "crime_type_id", "severity", "user_location"},
     *             @OA\Property(property="latitude", type="number", format="float", example=-23.5505),
     *             @OA\Property(property="longitude", type="number", format="float", example=-46.6333),
     *             @OA\Property(property="crime_type_id", type="integer", example=1),
     *             @OA\Property(property="severity", type="string", enum={"low", "medium", "high", "critical"}, example="medium"),
     *             @OA\Property(property="timestamp", type="string", format="date-time", example="2025-01-05T10:30:00Z"),
     *             @OA\Property(
     *                 property="user_location",
     *                 type="object",
     *                 required={"latitude", "longitude"},
     *                 @OA\Property(property="latitude", type="number", format="float", example=-23.5506),
     *                 @OA\Property(property="longitude", type="number", format="float", example=-46.6334)
     *             ),
     *             @OA\Property(
     *                 property="metadata",
     *                 type="object",
     *                 @OA\Property(property="description", type="string", maxLength=500, example="Assalto a mão armada")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Ocorrência criada com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/Occurrence"),
     *             @OA\Property(property="message", type="string", example="Ocorrência registrada com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação ou localização inválida",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     ),
     *     @OA\Response(
     *         response=429,
     *         description="Limite de reportes excedido",
     *         @OA\JsonContent(
     *             @OA\Property(property="error", type="string", example="rate_limit_exceeded"),
     *             @OA\Property(property="message", type="string", example="Limite de 5 reportes por hora excedido")
     *         )
     *     )
     * )
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
     * @OA\Get(
     *     path="/occurrences/{id}",
     *     operationId="getOccurrence",
     *     tags={"Occurrences"},
     *     summary="Obter ocorrência",
     *     description="Retorna os detalhes de uma ocorrência específica",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID da ocorrência",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Detalhes da ocorrência",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/Occurrence")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ocorrência não encontrada",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function show(string $id): JsonResponse
    {
        $occurrence = $this->occurrenceService->getOccurrence((int) $id);

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

    /**
     * Delete an occurrence.
     *
     * @OA\Delete(
     *     path="/occurrences/{id}",
     *     operationId="deleteOccurrence",
     *     tags={"Occurrences"},
     *     summary="Excluir ocorrência",
     *     description="Exclui uma ocorrência criada pelo usuário autenticado",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID da ocorrência",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Ocorrência excluída com sucesso",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Ocorrência excluída com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Não autorizado a excluir esta ocorrência",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ocorrência não encontrada",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function destroy(string $id): JsonResponse
    {
        $occurrence = Occurrence::find((int) $id);

        if (!$occurrence) {
            return response()->json([
                'error' => 'not_found',
                'message' => __('messages.occurrence_not_found'),
            ], 404);
        }

        // Check if user owns this occurrence
        $user = request()->user();
        if (!$user || $occurrence->created_by !== $user->id) {
            return response()->json([
                'error' => 'forbidden',
                'message' => __('messages.occurrence_delete_forbidden'),
            ], 403);
        }

        $occurrence->delete();

        return response()->json([
            'message' => __('messages.occurrence_deleted'),
        ]);
    }
}
