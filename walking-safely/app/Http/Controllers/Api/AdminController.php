<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCrimeCategoryRequest;
use App\Http\Requests\UpdateTranslationRequest;
use App\Http\Requests\ModerationActionRequest;
use App\Http\Resources\ModerationQueueResource;
use App\Http\Resources\CrimeCategoryResource;
use App\Http\Resources\TranslationResource;
use App\Models\AuditLog;
use App\Models\CrimeCategory;
use App\Models\ModerationQueue;
use App\Models\Translation;
use App\Services\I18nService;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller for admin operations.
 *
 * @see Requirement 13.2 - Taxonomy versioning
 * @see Requirement 14.2 - Moderation audit
 * @see Requirement 22.3 - Translation management interface
 */
class AdminController extends Controller
{
    public function __construct(
        private ModerationService $moderationService,
        private I18nService $i18nService
    ) {}

    /*
    |--------------------------------------------------------------------------
    | Moderation Endpoints
    |--------------------------------------------------------------------------
    */

    /**
     * Get pending moderation items.
     *
     * @OA\Get(
     *     path="/admin/moderation",
     *     operationId="getModerationQueue",
     *     tags={"Admin"},
     *     summary="Fila de moderação",
     *     description="Retorna itens pendentes de moderação",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         description="Limite de itens (padrão: 50)",
     *         @OA\Schema(type="integer", default=50)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Fila de moderação",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/ModerationItem")),
     *             @OA\Property(
     *                 property="statistics",
     *                 type="object",
     *                 @OA\Property(property="pending", type="integer"),
     *                 @OA\Property(property="approved_today", type="integer"),
     *                 @OA\Property(property="rejected_today", type="integer")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão de administrador")
     * )
     *
     * @see Requirement 14.1 - Moderation queue
     */
    public function getModerationQueue(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $limit = $request->input('limit', 50);
        $items = $this->moderationService->getPendingItems($limit);

        return response()->json([
            'data' => ModerationQueueResource::collection($items),
            'statistics' => $this->moderationService->getStatistics(),
        ]);
    }

    /**
     * Approve a moderation item.
     *
     * @OA\Post(
     *     path="/admin/moderation/{id}/approve",
     *     operationId="approveModeration",
     *     tags={"Admin"},
     *     summary="Aprovar item de moderação",
     *     description="Aprova um item pendente de moderação",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID do item de moderação",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="notes", type="string", nullable=true, example="Aprovado após verificação")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Item aprovado",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/ModerationItem"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=404, description="Item não encontrado")
     * )
     *
     * @see Requirement 14.2 - Record moderation decision with timestamp and moderator
     */
    public function approveModeration(ModerationActionRequest $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $item = ModerationQueue::findOrFail($id);
        $validated = $request->validated();

        $this->moderationService->approve(
            $item,
            $request->user(),
            $validated['notes'] ?? null
        );

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'moderation_approved',
            'target_type' => ModerationQueue::class,
            'target_id' => $id,
            'details' => [
                'occurrence_id' => $item->occurrence_id,
                'notes' => $validated['notes'] ?? null,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new ModerationQueueResource($item->fresh()),
            'message' => __('messages.moderation_approved'),
        ]);
    }

    /**
     * Reject a moderation item.
     *
     * @OA\Post(
     *     path="/admin/moderation/{id}/reject",
     *     operationId="rejectModeration",
     *     tags={"Admin"},
     *     summary="Rejeitar item de moderação",
     *     description="Rejeita um item pendente de moderação",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID do item de moderação",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="notes", type="string", nullable=true, example="Informações insuficientes")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Item rejeitado",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/ModerationItem"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=404, description="Item não encontrado")
     * )
     *
     * @see Requirement 14.2 - Record moderation decision with timestamp and moderator
     */
    public function rejectModeration(ModerationActionRequest $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $item = ModerationQueue::findOrFail($id);
        $validated = $request->validated();

        $this->moderationService->reject(
            $item,
            $request->user(),
            $validated['notes'] ?? null
        );

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'moderation_rejected',
            'target_type' => ModerationQueue::class,
            'target_id' => $id,
            'details' => [
                'occurrence_id' => $item->occurrence_id,
                'notes' => $validated['notes'] ?? null,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new ModerationQueueResource($item->fresh()),
            'message' => __('messages.moderation_rejected'),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Taxonomy Endpoints
    |--------------------------------------------------------------------------
    */

    /**
     * Get all crime categories.
     *
     * @OA\Get(
     *     path="/admin/taxonomy/categories",
     *     operationId="getCategories",
     *     tags={"Admin"},
     *     summary="Listar categorias de crime",
     *     description="Retorna todas as categorias de crime com hierarquia",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Lista de categorias",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/CrimeCategory"))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     */
    public function getCategories(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $categories = CrimeCategory::with(['children', 'translations'])
            ->whereNull('parent_id')
            ->get();

        return response()->json([
            'data' => CrimeCategoryResource::collection($categories),
        ]);
    }

    /**
     * Update a crime category.
     *
     * @OA\Put(
     *     path="/admin/taxonomy/categories/{id}",
     *     operationId="updateCategory",
     *     tags={"Admin"},
     *     summary="Atualizar categoria de crime",
     *     description="Atualiza uma categoria de crime. Cria versão antes de atualizar.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID da categoria",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Crimes contra o patrimônio"),
     *             @OA\Property(property="slug", type="string", example="crimes-patrimonio"),
     *             @OA\Property(property="description", type="string", nullable=true),
     *             @OA\Property(property="parent_id", type="integer", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Categoria atualizada",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/CrimeCategory"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=404, description="Categoria não encontrada")
     * )
     *
     * @see Requirement 13.2 - Version taxonomy changes and maintain history
     */
    public function updateCategory(UpdateCrimeCategoryRequest $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $category = CrimeCategory::findOrFail($id);
        $validated = $request->validated();

        // Create version before updating
        $category->createVersion($request->user()->id);

        // Update the category
        $category->update($validated);
        $category->incrementVersion();

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'taxonomy_updated',
            'target_type' => CrimeCategory::class,
            'target_id' => $id,
            'details' => [
                'changes' => $validated,
                'new_version' => $category->version,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new CrimeCategoryResource($category->fresh()),
            'message' => __('messages.category_updated'),
        ]);
    }

    /**
     * Create a new crime category.
     *
     * @OA\Post(
     *     path="/admin/taxonomy/categories",
     *     operationId="createCategory",
     *     tags={"Admin"},
     *     summary="Criar categoria de crime",
     *     description="Cria uma nova categoria de crime",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "slug"},
     *             @OA\Property(property="name", type="string", example="Nova categoria"),
     *             @OA\Property(property="slug", type="string", example="nova-categoria"),
     *             @OA\Property(property="description", type="string", nullable=true),
     *             @OA\Property(property="parent_id", type="integer", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Categoria criada",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/CrimeCategory"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=422, description="Erro de validação")
     * )
     */
    public function createCategory(UpdateCrimeCategoryRequest $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validated();
        $validated['version'] = 1;

        $category = CrimeCategory::create($validated);

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'taxonomy_created',
            'target_type' => CrimeCategory::class,
            'target_id' => $category->id,
            'details' => $validated,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new CrimeCategoryResource($category),
            'message' => __('messages.category_created'),
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Translation Endpoints
    |--------------------------------------------------------------------------
    */

    /**
     * Get all translations for a locale.
     *
     * @OA\Get(
     *     path="/admin/translations",
     *     operationId="getTranslations",
     *     tags={"Admin"},
     *     summary="Listar traduções",
     *     description="Retorna todas as traduções para um locale específico",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="locale",
     *         in="query",
     *         description="Código do locale",
     *         @OA\Schema(type="string", enum={"pt_BR", "en", "es"}, default="pt_BR")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lista de traduções",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/Translation")),
     *             @OA\Property(property="locale", type="string"),
     *             @OA\Property(property="supported_locales", type="array", @OA\Items(type="string"))
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     *
     * @see Requirement 22.3 - Administrative interface for translations
     */
    public function getTranslations(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $locale = $request->input('locale', $this->i18nService->getDefaultLocale());
        $translations = $this->i18nService->getAllTranslations($locale);

        return response()->json([
            'data' => TranslationResource::collection($translations),
            'locale' => $locale,
            'supported_locales' => $this->i18nService->getSupportedLocales(),
        ]);
    }

    /**
     * Update or create a translation.
     *
     * @OA\Put(
     *     path="/admin/translations",
     *     operationId="updateTranslation",
     *     tags={"Admin"},
     *     summary="Atualizar tradução",
     *     description="Atualiza ou cria uma tradução. Mantém histórico de versões.",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"key", "locale", "value"},
     *             @OA\Property(property="key", type="string", example="messages.welcome"),
     *             @OA\Property(property="locale", type="string", enum={"pt_BR", "en", "es"}, example="pt_BR"),
     *             @OA\Property(property="value", type="string", example="Bem-vindo ao Walking Safely")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Tradução atualizada",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", ref="#/components/schemas/Translation"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=422, description="Erro de validação")
     * )
     *
     * @see Requirement 22.4 - Version translation changes and maintain history
     */
    public function updateTranslation(UpdateTranslationRequest $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validated();

        $translation = $this->i18nService->setTranslation(
            $validated['key'],
            $validated['locale'],
            $validated['value'],
            $request->user()->id
        );

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'translation_updated',
            'target_type' => Translation::class,
            'target_id' => $translation->id,
            'details' => [
                'key' => $validated['key'],
                'locale' => $validated['locale'],
                'new_version' => $translation->version,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => new TranslationResource($translation),
            'message' => __('messages.translation_updated'),
        ]);
    }

    /**
     * Export translations for a locale.
     *
     * @OA\Get(
     *     path="/admin/translations/export",
     *     operationId="exportTranslations",
     *     tags={"Admin"},
     *     summary="Exportar traduções",
     *     description="Exporta todas as traduções de um locale em formato JSON",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="locale",
     *         in="query",
     *         description="Código do locale",
     *         @OA\Schema(type="string", enum={"pt_BR", "en", "es"}, default="pt_BR")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Traduções exportadas",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="object"),
     *             @OA\Property(property="locale", type="string"),
     *             @OA\Property(property="exported_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão")
     * )
     *
     * @see Requirement 22.5 - Export translations in JSON format
     */
    public function exportTranslations(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $locale = $request->input('locale', $this->i18nService->getDefaultLocale());
        $translations = $this->i18nService->exportTranslations($locale);

        return response()->json([
            'data' => $translations,
            'locale' => $locale,
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Import translations for a locale.
     *
     * @OA\Post(
     *     path="/admin/translations/import",
     *     operationId="importTranslations",
     *     tags={"Admin"},
     *     summary="Importar traduções",
     *     description="Importa traduções de um arquivo JSON para um locale",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"locale", "translations"},
     *             @OA\Property(property="locale", type="string", enum={"pt_BR", "en", "es"}, example="pt_BR"),
     *             @OA\Property(
     *                 property="translations",
     *                 type="object",
     *                 example={"messages.welcome": "Bem-vindo", "messages.goodbye": "Até logo"}
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Traduções importadas",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="count", type="integer", example=25)
     *         )
     *     ),
     *     @OA\Response(response=401, description="Não autenticado"),
     *     @OA\Response(response=403, description="Sem permissão"),
     *     @OA\Response(response=422, description="Erro de validação")
     * )
     *
     * @see Requirement 22.5 - Import translations in JSON format
     */
    public function importTranslations(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'locale' => ['required', 'string', 'in:pt_BR,en,es'],
            'translations' => ['required', 'array'],
        ]);

        $count = $this->i18nService->importTranslations(
            $request->input('locale'),
            $request->input('translations'),
            $request->user()->id
        );

        // Log the action
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'translations_imported',
            'target_type' => Translation::class,
            'target_id' => null,
            'details' => [
                'locale' => $request->input('locale'),
                'count' => $count,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => __('messages.translations_imported', ['count' => $count]),
            'count' => $count,
        ]);
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
