<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="Walking Safely API",
 *     description="API para o aplicativo Walking Safely - Navegação segura com análise de risco em tempo real",
 *     @OA\Contact(
 *         email="suporte@walkingsafely.com",
 *         name="Walking Safely Team"
 *     ),
 *     @OA\License(
 *         name="MIT",
 *         url="https://opensource.org/licenses/MIT"
 *     )
 * )
 *
 * @OA\Server(
 *     url="http://localhost:8000/api",
 *     description="Servidor de Desenvolvimento"
 * )
 *
 * @OA\Server(
 *     url="https://api.walkingsafely.com/api",
 *     description="Servidor de Produção"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Autenticação via Bearer Token. Use o token retornado pelo endpoint /auth/login"
 * )
 *
 * @OA\Tag(name="Authentication", description="Endpoints de autenticação de usuários")
 * @OA\Tag(name="Routes", description="Cálculo e recálculo de rotas com análise de risco")
 * @OA\Tag(name="Occurrences", description="Gerenciamento de ocorrências criminais")
 * @OA\Tag(name="Geocoding", description="Geocodificação e geocodificação reversa")
 * @OA\Tag(name="Alerts", description="Sistema de alertas e preferências")
 * @OA\Tag(name="Heatmap", description="Visualização de mapa de calor de ocorrências")
 * @OA\Tag(name="TimeSeries", description="Análise temporal de ocorrências")
 * @OA\Tag(name="Analytics", description="Dashboard e métricas analíticas (Admin)")
 * @OA\Tag(name="Admin", description="Operações administrativas")
 *
 * @OA\Schema(
 *     schema="Coordinates",
 *     type="object",
 *     required={"latitude", "longitude"},
 *     @OA\Property(property="latitude", type="number", format="float", minimum=-90, maximum=90, example=-23.5505),
 *     @OA\Property(property="longitude", type="number", format="float", minimum=-180, maximum=180, example=-46.6333)
 * )
 *
 * @OA\Schema(
 *     schema="OccurrenceSeverity",
 *     type="string",
 *     enum={"low", "medium", "high", "critical"},
 *     description="Nível de severidade da ocorrência"
 * )
 *
 * @OA\Schema(
 *     schema="OccurrenceStatus",
 *     type="string",
 *     enum={"active", "expired", "rejected", "merged"},
 *     description="Status da ocorrência"
 * )
 *
 * @OA\Schema(
 *     schema="OccurrenceSource",
 *     type="string",
 *     enum={"collaborative", "official"},
 *     description="Fonte da ocorrência"
 * )
 *
 * @OA\Schema(
 *     schema="UserRole",
 *     type="string",
 *     enum={"user", "moderator", "admin"},
 *     description="Papel do usuário no sistema"
 * )
 *
 * @OA\Schema(
 *     schema="Error",
 *     type="object",
 *     @OA\Property(property="error", type="string", example="validation_error"),
 *     @OA\Property(property="message", type="string", example="Os dados fornecidos são inválidos")
 * )
 *
 * @OA\Schema(
 *     schema="ValidationError",
 *     type="object",
 *     @OA\Property(property="message", type="string", example="Os dados fornecidos são inválidos"),
 *     @OA\Property(
 *         property="errors",
 *         type="object",
 *         @OA\AdditionalProperties(
 *             type="array",
 *             @OA\Items(type="string")
 *         )
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="PaginationMeta",
 *     type="object",
 *     @OA\Property(property="current_page", type="integer", example=1),
 *     @OA\Property(property="from", type="integer", example=1),
 *     @OA\Property(property="last_page", type="integer", example=10),
 *     @OA\Property(property="per_page", type="integer", example=15),
 *     @OA\Property(property="to", type="integer", example=15),
 *     @OA\Property(property="total", type="integer", example=150)
 * )
 */
abstract class Controller
{
    //
}
