<?php

namespace App\Http\Controllers\Api\Swagger;

/**
 * Swagger Schema Definitions
 *
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="João Silva"),
 *     @OA\Property(property="email", type="string", format="email", example="joao@email.com"),
 *     @OA\Property(property="locale", type="string", example="pt_BR"),
 *     @OA\Property(property="role", type="string", enum={"user", "moderator", "admin"}, example="user"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="Occurrence",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="latitude", type="number", format="float", example=-23.5505),
 *     @OA\Property(property="longitude", type="number", format="float", example=-46.6333),
 *     @OA\Property(property="crime_type_id", type="integer", example=1),
 *     @OA\Property(property="crime_type", type="string", example="Assalto"),
 *     @OA\Property(property="severity", type="string", enum={"low", "medium", "high", "critical"}, example="medium"),
 *     @OA\Property(property="status", type="string", enum={"active", "expired", "rejected", "merged"}, example="active"),
 *     @OA\Property(property="source", type="string", enum={"collaborative", "official"}, example="collaborative"),
 *     @OA\Property(property="timestamp", type="string", format="date-time"),
 *     @OA\Property(property="confidence_score", type="integer", example=3),
 *     @OA\Property(property="region_id", type="integer", nullable=true, example=5),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="RouteWithRisk",
 *     type="object",
 *     @OA\Property(
 *         property="route",
 *         type="object",
 *         @OA\Property(property="distance", type="number", example=2500, description="Distância em metros"),
 *         @OA\Property(property="duration", type="number", example=1800, description="Duração em segundos"),
 *         @OA\Property(
 *             property="polyline",
 *             type="array",
 *             @OA\Items(ref="#/components/schemas/Coordinates")
 *         ),
 *         @OA\Property(property="instructions", type="array", @OA\Items(type="string"))
 *     ),
 *     @OA\Property(
 *         property="risk_analysis",
 *         type="object",
 *         @OA\Property(property="overall_risk", type="string", enum={"low", "medium", "high", "critical"}, example="medium"),
 *         @OA\Property(property="risk_score", type="number", format="float", example=0.45),
 *         @OA\Property(
 *             property="risk_segments",
 *             type="array",
 *             @OA\Items(
 *                 type="object",
 *                 @OA\Property(property="start_index", type="integer"),
 *                 @OA\Property(property="end_index", type="integer"),
 *                 @OA\Property(property="risk_level", type="string"),
 *                 @OA\Property(property="risk_score", type="number")
 *             )
 *         ),
 *         @OA\Property(
 *             property="risk_factors",
 *             type="array",
 *             @OA\Items(
 *                 type="object",
 *                 @OA\Property(property="type", type="string"),
 *                 @OA\Property(property="description", type="string"),
 *                 @OA\Property(property="weight", type="number")
 *             )
 *         )
 *     ),
 *     @OA\Property(property="is_safe_route", type="boolean", example=true)
 * )
 *
 * @OA\Schema(
 *     schema="RouteRecalculation",
 *     type="object",
 *     @OA\Property(property="recalculated", type="boolean", example=true),
 *     @OA\Property(property="reason", type="string", example="travel_time_increased"),
 *     @OA\Property(property="new_route", ref="#/components/schemas/RouteWithRisk"),
 *     @OA\Property(property="risk_changed", type="boolean", example=false),
 *     @OA\Property(property="previous_risk", type="string", example="medium"),
 *     @OA\Property(property="new_risk", type="string", example="medium")
 * )
 *
 * @OA\Schema(
 *     schema="Address",
 *     type="object",
 *     @OA\Property(property="formatted_address", type="string", example="Av. Paulista, 1000 - Bela Vista, São Paulo - SP"),
 *     @OA\Property(property="street", type="string", example="Av. Paulista"),
 *     @OA\Property(property="number", type="string", example="1000"),
 *     @OA\Property(property="neighborhood", type="string", example="Bela Vista"),
 *     @OA\Property(property="city", type="string", example="São Paulo"),
 *     @OA\Property(property="state", type="string", example="SP"),
 *     @OA\Property(property="country", type="string", example="Brasil"),
 *     @OA\Property(property="postal_code", type="string", example="01310-100"),
 *     @OA\Property(
 *         property="coordinates",
 *         type="object",
 *         @OA\Property(property="latitude", type="number", format="float", example=-23.5505),
 *         @OA\Property(property="longitude", type="number", format="float", example=-46.6333)
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="Alert",
 *     type="object",
 *     @OA\Property(property="type", type="string", example="high_risk_region"),
 *     @OA\Property(property="severity", type="string", enum={"low", "medium", "high", "critical"}, example="high"),
 *     @OA\Property(property="message", type="string", example="Você está entrando em uma região de alto risco"),
 *     @OA\Property(property="region_name", type="string", example="Centro"),
 *     @OA\Property(property="distance", type="number", example=150, description="Distância em metros"),
 *     @OA\Property(
 *         property="location",
 *         type="object",
 *         @OA\Property(property="latitude", type="number", format="float"),
 *         @OA\Property(property="longitude", type="number", format="float")
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="AlertPreference",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="user_id", type="integer", example=1),
 *     @OA\Property(property="alerts_enabled", type="boolean", example=true),
 *     @OA\Property(
 *         property="enabled_crime_types",
 *         type="array",
 *         @OA\Items(type="integer"),
 *         example={1, 2, 3}
 *     ),
 *     @OA\Property(property="active_hours_start", type="string", format="time", nullable=true, example="18:00"),
 *     @OA\Property(property="active_hours_end", type="string", format="time", nullable=true, example="06:00"),
 *     @OA\Property(
 *         property="active_days",
 *         type="array",
 *         @OA\Items(type="integer"),
 *         example={0, 1, 2, 3, 4, 5, 6}
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="HeatmapPoint",
 *     type="object",
 *     @OA\Property(property="latitude", type="number", format="float", example=-23.5505),
 *     @OA\Property(property="longitude", type="number", format="float", example=-46.6333),
 *     @OA\Property(property="weight", type="number", format="float", example=0.75),
 *     @OA\Property(property="count", type="integer", example=15)
 * )
 *
 * @OA\Schema(
 *     schema="RegionHeatmap",
 *     type="object",
 *     @OA\Property(property="region_id", type="integer", example=1),
 *     @OA\Property(property="region_name", type="string", example="Centro"),
 *     @OA\Property(property="occurrence_count", type="integer", example=150),
 *     @OA\Property(property="risk_index", type="number", format="float", example=0.72),
 *     @OA\Property(
 *         property="centroid",
 *         type="object",
 *         @OA\Property(property="latitude", type="number", format="float"),
 *         @OA\Property(property="longitude", type="number", format="float")
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="CrimeDistribution",
 *     type="object",
 *     @OA\Property(property="crime_type_id", type="integer", example=1),
 *     @OA\Property(property="crime_type_name", type="string", example="Assalto"),
 *     @OA\Property(property="count", type="integer", example=250),
 *     @OA\Property(property="percentage", type="number", format="float", example=35.5)
 * )
 *
 * @OA\Schema(
 *     schema="TimeSeriesPoint",
 *     type="object",
 *     @OA\Property(property="period", type="string", example="2025-01-05"),
 *     @OA\Property(property="count", type="integer", example=45),
 *     @OA\Property(property="cumulative", type="integer", example=1250)
 * )
 *
 * @OA\Schema(
 *     schema="ModerationItem",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="occurrence_id", type="integer", example=123),
 *     @OA\Property(property="status", type="string", enum={"pending", "approved", "rejected"}, example="pending"),
 *     @OA\Property(property="reason", type="string", nullable=true),
 *     @OA\Property(property="moderator_id", type="integer", nullable=true),
 *     @OA\Property(property="moderated_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="notes", type="string", nullable=true),
 *     @OA\Property(property="occurrence", ref="#/components/schemas/Occurrence"),
 *     @OA\Property(property="created_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="CrimeCategory",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Crimes contra o patrimônio"),
 *     @OA\Property(property="slug", type="string", example="crimes-patrimonio"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="parent_id", type="integer", nullable=true),
 *     @OA\Property(property="version", type="integer", example=1),
 *     @OA\Property(
 *         property="children",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/CrimeCategory")
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="Translation",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="key", type="string", example="messages.welcome"),
 *     @OA\Property(property="locale", type="string", example="pt_BR"),
 *     @OA\Property(property="value", type="string", example="Bem-vindo ao Walking Safely"),
 *     @OA\Property(property="version", type="integer", example=1),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="DashboardData",
 *     type="object",
 *     @OA\Property(
 *         property="summary",
 *         type="object",
 *         @OA\Property(property="total_occurrences", type="integer", example=1500),
 *         @OA\Property(property="active_occurrences", type="integer", example=1200),
 *         @OA\Property(property="pending_moderation", type="integer", example=25),
 *         @OA\Property(property="total_users", type="integer", example=5000)
 *     ),
 *     @OA\Property(
 *         property="trends",
 *         type="object",
 *         @OA\Property(property="occurrences_change", type="number", format="float", example=12.5),
 *         @OA\Property(property="users_change", type="number", format="float", example=8.3)
 *     ),
 *     @OA\Property(
 *         property="distribution_by_type",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/CrimeDistribution")
 *     ),
 *     @OA\Property(
 *         property="distribution_by_region",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/RegionHeatmap")
 *     )
 * )
 */
class Schemas
{
    // This class exists only to hold Swagger schema annotations
}
