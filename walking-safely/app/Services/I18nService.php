<?php

namespace App\Services;

use App\Models\CrimeType;
use App\Models\Translation;
use App\Models\TranslationVersion;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class I18nService
{
    /**
     * Supported locales for the application.
     *
     * @var array<string>
     */
    protected array $supportedLocales = ['pt_BR', 'en', 'es'];

    /**
     * Default locale for the application.
     */
    protected string $defaultLocale = 'pt_BR';

    /**
     * Cache TTL in seconds (1 hour).
     */
    protected int $cacheTtl = 3600;

    /**
     * Translate a key to the specified locale.
     *
     * @param string $key The translation key
     * @param string $locale The target locale
     * @param array<string, mixed> $params Parameters for placeholder replacement
     * @return string The translated string
     */
    public function translate(string $key, string $locale, array $params = []): string
    {
        $translation = $this->getTranslationWithFallback($key, $locale);
        
        return $this->replacePlaceholders($translation, $params);
    }

    /**
     * Get translation with fallback to default locale.
     *
     * @param string $key The translation key
     * @param string $locale The target locale
     * @return string The translated string or the key if not found
     */
    public function getTranslationWithFallback(string $key, string $locale): string
    {
        // First, try to get from database (dynamic translations)
        $dbTranslation = $this->getFromDatabase($key, $locale);
        if ($dbTranslation !== null) {
            return $dbTranslation;
        }

        // Try fallback locale in database
        if ($locale !== $this->defaultLocale) {
            $dbTranslation = $this->getFromDatabase($key, $this->defaultLocale);
            if ($dbTranslation !== null) {
                return $dbTranslation;
            }
        }

        // Fall back to Laravel's translation files
        $fileTranslation = __($key, [], $locale);
        if ($fileTranslation !== $key) {
            return $fileTranslation;
        }

        // Try fallback locale in files
        if ($locale !== $this->defaultLocale) {
            $fileTranslation = __($key, [], $this->defaultLocale);
            if ($fileTranslation !== $key) {
                return $fileTranslation;
            }
        }

        // Return the key itself if no translation found
        return $key;
    }

    /**
     * Get translation from database with caching.
     *
     * @param string $key The translation key
     * @param string $locale The target locale
     * @return string|null The translation value or null if not found
     */
    protected function getFromDatabase(string $key, string $locale): ?string
    {
        $cacheKey = "translation:{$locale}:{$key}";

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($key, $locale) {
            $translation = Translation::where('key', $key)
                ->where('locale', $locale)
                ->first();

            return $translation?->value;
        });
    }

    /**
     * Replace placeholders in a translation string.
     *
     * @param string $translation The translation string
     * @param array<string, mixed> $params The parameters to replace
     * @return string The string with placeholders replaced
     */
    protected function replacePlaceholders(string $translation, array $params): string
    {
        foreach ($params as $key => $value) {
            $translation = str_replace(":{$key}", (string) $value, $translation);
        }

        return $translation;
    }

    /**
     * Get all supported locales.
     *
     * @return array<string>
     */
    public function getSupportedLocales(): array
    {
        return $this->supportedLocales;
    }

    /**
     * Get the default locale.
     *
     * @return string
     */
    public function getDefaultLocale(): string
    {
        return $this->defaultLocale;
    }

    /**
     * Check if a locale is supported.
     *
     * @param string $locale The locale to check
     * @return bool
     */
    public function isLocaleSupported(string $locale): bool
    {
        return in_array($locale, $this->supportedLocales);
    }

    /**
     * Translate a crime type to the specified locale.
     *
     * @param CrimeType $crimeType The crime type to translate
     * @param string $locale The target locale
     * @return array{name: string, description: string|null}
     */
    public function translateCrimeType(CrimeType $crimeType, string $locale): array
    {
        // Try to get translation for the requested locale
        $translation = $crimeType->translations()
            ->where('locale', $locale)
            ->first();

        if ($translation) {
            return [
                'name' => $translation->name,
                'description' => $translation->description,
            ];
        }

        // Fallback to default locale
        if ($locale !== $this->defaultLocale) {
            $translation = $crimeType->translations()
                ->where('locale', $this->defaultLocale)
                ->first();

            if ($translation) {
                return [
                    'name' => $translation->name,
                    'description' => $translation->description,
                ];
            }
        }

        // Return the base crime type name if no translation found
        return [
            'name' => $crimeType->name,
            'description' => $crimeType->description,
        ];
    }

    /**
     * Create or update a translation.
     *
     * @param string $key The translation key
     * @param string $locale The locale
     * @param string $value The translation value
     * @param int|null $userId The user making the change
     * @return Translation
     */
    public function setTranslation(string $key, string $locale, string $value, ?int $userId = null): Translation
    {
        return DB::transaction(function () use ($key, $locale, $value, $userId) {
            $translation = Translation::where('key', $key)
                ->where('locale', $locale)
                ->first();

            if ($translation) {
                // Create version history before updating
                TranslationVersion::create([
                    'translation_id' => $translation->id,
                    'version' => $translation->version,
                    'value' => $translation->value,
                    'updated_by' => $translation->updated_by,
                ]);

                // Update the translation
                $translation->update([
                    'value' => $value,
                    'version' => $translation->version + 1,
                    'updated_by' => $userId,
                ]);
            } else {
                // Create new translation
                $translation = Translation::create([
                    'key' => $key,
                    'locale' => $locale,
                    'value' => $value,
                    'version' => 1,
                    'updated_by' => $userId,
                ]);
            }

            // Clear cache for this translation
            $this->clearTranslationCache($key, $locale);

            return $translation;
        });
    }

    /**
     * Get a translation by key and locale.
     *
     * @param string $key The translation key
     * @param string $locale The locale
     * @return Translation|null
     */
    public function getTranslation(string $key, string $locale): ?Translation
    {
        return Translation::where('key', $key)
            ->where('locale', $locale)
            ->first();
    }

    /**
     * Get all translations for a locale.
     *
     * @param string $locale The locale
     * @return \Illuminate\Database\Eloquent\Collection<int, Translation>
     */
    public function getAllTranslations(string $locale): \Illuminate\Database\Eloquent\Collection
    {
        return Translation::where('locale', $locale)->get();
    }

    /**
     * Get version history for a translation.
     *
     * @param string $key The translation key
     * @param string $locale The locale
     * @return \Illuminate\Database\Eloquent\Collection<int, TranslationVersion>
     */
    public function getTranslationHistory(string $key, string $locale): \Illuminate\Database\Eloquent\Collection
    {
        $translation = Translation::where('key', $key)
            ->where('locale', $locale)
            ->first();

        if (!$translation) {
            return collect();
        }

        return $translation->versions()->orderBy('version', 'desc')->get();
    }

    /**
     * Export all translations for a locale as JSON.
     *
     * @param string $locale The locale to export
     * @return array<string, string>
     */
    public function exportTranslations(string $locale): array
    {
        $translations = Translation::where('locale', $locale)->get();

        $result = [];
        foreach ($translations as $translation) {
            $result[$translation->key] = $translation->value;
        }

        return $result;
    }

    /**
     * Import translations from JSON data.
     *
     * @param string $locale The locale to import to
     * @param array<string, string> $data The translation data
     * @param int|null $userId The user making the import
     * @return int Number of translations imported
     */
    public function importTranslations(string $locale, array $data, ?int $userId = null): int
    {
        $count = 0;

        DB::transaction(function () use ($locale, $data, $userId, &$count) {
            foreach ($data as $key => $value) {
                if (is_string($key) && is_string($value)) {
                    $this->setTranslation($key, $locale, $value, $userId);
                    $count++;
                }
            }
        });

        return $count;
    }

    /**
     * Delete a translation.
     *
     * @param string $key The translation key
     * @param string $locale The locale
     * @return bool
     */
    public function deleteTranslation(string $key, string $locale): bool
    {
        $translation = Translation::where('key', $key)
            ->where('locale', $locale)
            ->first();

        if ($translation) {
            $translation->delete();
            $this->clearTranslationCache($key, $locale);
            return true;
        }

        return false;
    }

    /**
     * Clear the cache for a specific translation.
     *
     * @param string $key The translation key
     * @param string $locale The locale
     */
    public function clearTranslationCache(string $key, string $locale): void
    {
        Cache::forget("translation:{$locale}:{$key}");
    }

    /**
     * Clear all translation caches for a locale.
     *
     * @param string $locale The locale
     */
    public function clearAllTranslationCache(string $locale): void
    {
        // Get all translation keys for this locale and clear their cache
        $translations = Translation::where('locale', $locale)->pluck('key');
        
        foreach ($translations as $key) {
            Cache::forget("translation:{$locale}:{$key}");
        }
    }

    /**
     * Get the current locale from the application.
     *
     * @return string
     */
    public function getCurrentLocale(): string
    {
        return App::getLocale();
    }
}
