<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\App;

/**
 * Resource for localized error responses.
 * 
 * This resource ensures that all error responses contain:
 * - A unique error code for programmatic handling
 * - A translation key for client-side localization
 * - A localized message in the user's preferred language
 * - Optional parameters for dynamic message content
 * 
 * @property string $code The error code
 * @property string $translationKey The translation key
 * @property array<string, mixed> $params Optional parameters for placeholder replacement
 */
class LocalizedErrorResource extends JsonResource
{
    /**
     * The error code.
     */
    public string $code;

    /**
     * The translation key for the error message.
     */
    public string $translationKey;

    /**
     * Parameters for placeholder replacement in the message.
     *
     * @var array<string, mixed>
     */
    public array $params;

    /**
     * Create a new localized error resource.
     *
     * @param string $code The error code
     * @param string $translationKey The translation key
     * @param array<string, mixed> $params Parameters for placeholder replacement
     */
    public function __construct(string $code, string $translationKey, array $params = [])
    {
        parent::__construct(null);
        
        $this->code = $code;
        $this->translationKey = $translationKey;
        $this->params = $params;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $locale = $this->getPreferredLocale($request);
        
        return [
            'code' => $this->code,
            'translation_key' => $this->translationKey,
            'message' => $this->getLocalizedMessage($locale),
            'params' => $this->params,
            'locale' => $locale,
        ];
    }

    /**
     * Get the localized error message.
     *
     * @param string $locale The locale to use
     * @return string
     */
    protected function getLocalizedMessage(string $locale): string
    {
        return __($this->translationKey, $this->params, $locale);
    }

    /**
     * Get the preferred locale from the request.
     *
     * @param Request $request
     * @return string
     */
    protected function getPreferredLocale(Request $request): string
    {
        // 1. Check for explicit locale in request header (X-Locale)
        if ($request->hasHeader('X-Locale')) {
            $locale = $request->header('X-Locale');
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 2. Check for locale query parameter
        if ($request->has('locale')) {
            $locale = $request->query('locale');
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 3. Check authenticated user's preferred locale
        if ($request->user() && $request->user()->locale) {
            $locale = $request->user()->locale;
            if ($this->isSupported($locale)) {
                return $locale;
            }
        }

        // 4. Check Accept-Language header
        $acceptLanguage = $request->header('Accept-Language');
        if ($acceptLanguage) {
            $locale = $this->parseAcceptLanguage($acceptLanguage);
            if ($locale && $this->isSupported($locale)) {
                return $locale;
            }
        }

        // 5. Fall back to current app locale or default
        return App::getLocale() ?: config('app.fallback_locale', 'pt_BR');
    }

    /**
     * Check if a locale is supported.
     *
     * @param string|null $locale
     * @return bool
     */
    protected function isSupported(?string $locale): bool
    {
        $supportedLocales = ['pt_BR', 'en', 'es'];
        return $locale && in_array($locale, $supportedLocales);
    }

    /**
     * Parse Accept-Language header and return the best matching locale.
     *
     * @param string $acceptLanguage
     * @return string|null
     */
    protected function parseAcceptLanguage(string $acceptLanguage): ?string
    {
        $languages = [];
        
        foreach (explode(',', $acceptLanguage) as $part) {
            $part = trim($part);
            $quality = 1.0;
            
            if (str_contains($part, ';q=')) {
                [$part, $q] = explode(';q=', $part);
                $quality = (float) $q;
            }
            
            $languages[$part] = $quality;
        }
        
        arsort($languages);
        
        $localeMap = [
            'pt' => 'pt_BR',
            'pt-BR' => 'pt_BR',
            'pt_BR' => 'pt_BR',
            'en' => 'en',
            'en-US' => 'en',
            'en-GB' => 'en',
            'es' => 'es',
            'es-ES' => 'es',
            'es-MX' => 'es',
        ];
        
        foreach (array_keys($languages) as $lang) {
            if (isset($localeMap[$lang])) {
                return $localeMap[$lang];
            }
            
            $baseLang = explode('-', str_replace('_', '-', $lang))[0];
            if (isset($localeMap[$baseLang])) {
                return $localeMap[$baseLang];
            }
        }
        
        return null;
    }

    /**
     * Create a validation error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function validationError(array $params = []): static
    {
        return new static('VALIDATION_ERROR', 'errors.validation', $params);
    }

    /**
     * Create a not found error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function notFound(array $params = []): static
    {
        return new static('NOT_FOUND', 'errors.not_found', $params);
    }

    /**
     * Create an unauthorized error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function unauthorized(array $params = []): static
    {
        return new static('UNAUTHORIZED', 'errors.unauthorized', $params);
    }

    /**
     * Create a server error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function serverError(array $params = []): static
    {
        return new static('SERVER_ERROR', 'errors.server_error', $params);
    }

    /**
     * Create a generic error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function genericError(array $params = []): static
    {
        return new static('GENERIC_ERROR', 'errors.generic', $params);
    }

    /**
     * Create a rate limit error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function rateLimitExceeded(array $params = []): static
    {
        return new static('RATE_LIMIT_EXCEEDED', 'occurrences.rate_limit', $params);
    }

    /**
     * Create a location invalid error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function locationInvalid(array $params = []): static
    {
        return new static('LOCATION_INVALID', 'occurrences.location_invalid', $params);
    }

    /**
     * Create a map provider unavailable error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function mapProviderUnavailable(array $params = []): static
    {
        return new static('MAP_PROVIDER_UNAVAILABLE', 'errors.map_provider_unavailable', $params);
    }

    /**
     * Create an account locked error resource.
     *
     * @param int $minutes Minutes until unlock
     * @return static
     */
    public static function accountLocked(int $minutes): static
    {
        return new static('ACCOUNT_LOCKED', 'auth.account_locked', ['minutes' => $minutes]);
    }

    /**
     * Create a location permission required error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function locationPermissionRequired(array $params = []): static
    {
        return new static('LOCATION_PERMISSION_REQUIRED', 'location_permission_required', $params);
    }

    /**
     * Create an authentication required error resource.
     *
     * @param array<string, mixed> $params
     * @return static
     */
    public static function authenticationRequired(array $params = []): static
    {
        return new static('AUTHENTICATION_REQUIRED', 'authentication_required', $params);
    }
}
