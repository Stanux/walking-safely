<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckAlertsRequest;
use App\Http\Requests\UpdateAlertPreferencesRequest;
use App\Http\Resources\AlertPreferenceResource;
use App\Services\AlertService;
use App\ValueObjects\Coordinates;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller for alert management.
 *
 * @see Requirement 6.1 - Alert when entering high risk region
 * @see Requirement 6.3 - Enable/disable alerts by occurrence type
 */
class AlertController extends Controller
{
    public function __construct(
        private AlertService $alertService
    ) {}

    /**
     * Check alert conditions for current position.
     *
     * @OA\Get(
     *     path="/alerts/check",
     *     operationId="checkAlerts",
     *     tags={"Alerts"},
     *     summary="Verificar alertas",
     *     description="Verifica condições de alerta para a posição atual. Distância de alerta varia com a velocidade.",
     *     @OA\Parameter(
     *         name="latitude",
     *         in="query",
     *         required=true,
     *         description="Latitude atual",
     *         @OA\Schema(type="number", format="float", example=-23.5505)
     *     ),
     *     @OA\Parameter(
     *         name="longitude",
     *         in="query",
     *         required=true,
     *         description="Longitude atual",
     *         @OA\Schema(type="number", format="float", example=-46.6333)
     *     ),
     *     @OA\Parameter(
     *         name="speed",
     *         in="query",
     *         description="Velocidade atual em km/h",
     *         @OA\Schema(type="number", minimum=0, maximum=300, example=5)
     *     ),
     *     @OA\Parameter(
     *         name="upcoming_waypoints",
     *         in="query",
     *         description="Próximos waypoints da rota (JSON array)",
     *         @OA\Schema(
     *             type="array",
     *             @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="latitude", type="number"),
     *                 @OA\Property(property="longitude", type="number")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Resultado da verificação de alertas",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(
     *                     property="alerts",
     *                     type="array",
     *                     @OA\Items(ref="#/components/schemas/Alert")
     *                 ),
     *                 @OA\Property(property="alert_distance", type="number", example=100)
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
     * @see Requirement 6.1 - Alert when entering high risk region
     * @see Requirement 6.4 - Alert distance based on speed
     */
    public function check(CheckAlertsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $position = new Coordinates(
            $validated['latitude'],
            $validated['longitude']
        );

        $speed = $validated['speed'] ?? 0;

        // Get user preferences if authenticated
        $preferences = null;
        if ($request->user()) {
            $preferences = $this->alertService->getUserAlertPreferences($request->user()->id);
        }

        // Check for alerts at current position
        $alerts = $this->alertService->checkAlertConditions(
            $position,
            $speed,
            $preferences
        );

        // Check for approaching alerts if waypoints provided
        if (isset($validated['upcoming_waypoints']) && !empty($validated['upcoming_waypoints'])) {
            $waypoints = array_map(
                fn($wp) => new Coordinates($wp['latitude'], $wp['longitude']),
                $validated['upcoming_waypoints']
            );

            $approachingAlerts = $this->alertService->checkApproachingAlerts(
                $position,
                $speed,
                $waypoints,
                $preferences
            );

            $alerts = array_merge($alerts, $approachingAlerts);
        }

        return response()->json([
            'data' => [
                'alerts' => $alerts,
                'alert_distance' => $this->alertService->calculateAlertDistance($speed),
            ],
        ]);
    }

    /**
     * Get user's alert preferences.
     *
     * @OA\Get(
     *     path="/alerts/preferences",
     *     operationId="getAlertPreferences",
     *     tags={"Alerts"},
     *     summary="Obter preferências de alertas",
     *     description="Retorna as preferências de alertas do usuário autenticado",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Preferências de alertas",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/AlertPreference")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Não autenticado",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        $preferences = $this->alertService->getUserAlertPreferences($user->id);

        if (!$preferences) {
            // Create default preferences if none exist
            $preferences = $this->alertService->createDefaultPreferences($user->id);
        }

        return response()->json([
            'data' => new AlertPreferenceResource($preferences),
        ]);
    }

    /**
     * Update user's alert preferences.
     *
     * @OA\Put(
     *     path="/alerts/preferences",
     *     operationId="updateAlertPreferences",
     *     tags={"Alerts"},
     *     summary="Atualizar preferências de alertas",
     *     description="Atualiza as preferências de alertas do usuário. Permite configurar tipos de crime, horários e dias ativos.",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="alerts_enabled", type="boolean", example=true),
     *             @OA\Property(
     *                 property="enabled_crime_types",
     *                 type="array",
     *                 @OA\Items(type="integer"),
     *                 example={1, 2, 3}
     *             ),
     *             @OA\Property(property="active_hours_start", type="string", format="time", example="18:00"),
     *             @OA\Property(property="active_hours_end", type="string", format="time", example="06:00"),
     *             @OA\Property(
     *                 property="active_days",
     *                 type="array",
     *                 @OA\Items(type="integer", minimum=0, maximum=6),
     *                 example={0, 1, 2, 3, 4, 5, 6},
     *                 description="0=Domingo, 6=Sábado"
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Preferências atualizadas",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/AlertPreference"),
     *             @OA\Property(property="message", type="string", example="Preferências atualizadas com sucesso")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Não autenticado",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationError")
     *     )
     * )
     *
     * @see Requirement 6.3 - Enable/disable alerts by occurrence type
     * @see Requirement 6.5 - Define specific hours for alert activation
     */
    public function updatePreferences(UpdateAlertPreferencesRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'unauthorized',
                'message' => __('messages.unauthorized'),
            ], 401);
        }

        $validated = $request->validated();

        $preferences = $this->alertService->updateAlertPreferences(
            $user->id,
            $validated
        );

        return response()->json([
            'data' => new AlertPreferenceResource($preferences),
            'message' => __('messages.preferences_updated'),
        ]);
    }
}
