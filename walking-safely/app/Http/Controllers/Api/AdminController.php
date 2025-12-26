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
     * GET /api/admin/moderation
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
     * POST /api/admin/moderation/{id}/approve
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
     * POST /api/admin/moderation/{id}/reject
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
     * GET /api/admin/taxonomy/categories
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
     * PUT /api/admin/taxonomy/categories/{id}
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
     * POST /api/admin/taxonomy/categories
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
     * GET /api/admin/translations
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
     * PUT /api/admin/translations
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
     * GET /api/admin/translations/export
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
     * POST /api/admin/translations/import
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
