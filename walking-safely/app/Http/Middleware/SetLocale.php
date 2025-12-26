<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Supported locales for the application.
     *
     * @var array<string>
     */
    protected array $supportedLocales = ['pt_BR', 'en', 'es'];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->determineLocale($request);
        
        App::setLocale($locale);

        return $next($request);
    }

    /**
     * Determine the locale for the request.
     */
    protected function determineLocale(Request $request): string
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

        // 5. Fall back to default locale
        return config('app.fallback_locale', 'pt_BR');
    }

    /**
     * Check if a locale is supported.
     */
    protected function isSupported(?string $locale): bool
    {
        return $locale && in_array($locale, $this->supportedLocales);
    }

    /**
     * Parse Accept-Language header and return the best matching locale.
     */
    protected function parseAcceptLanguage(string $acceptLanguage): ?string
    {
        $languages = [];
        
        // Parse the Accept-Language header
        foreach (explode(',', $acceptLanguage) as $part) {
            $part = trim($part);
            $quality = 1.0;
            
            if (str_contains($part, ';q=')) {
                [$part, $q] = explode(';q=', $part);
                $quality = (float) $q;
            }
            
            $languages[$part] = $quality;
        }
        
        // Sort by quality
        arsort($languages);
        
        // Map common language codes to our supported locales
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
            // Try exact match first
            if (isset($localeMap[$lang])) {
                return $localeMap[$lang];
            }
            
            // Try base language (e.g., 'pt' from 'pt-BR')
            $baseLang = explode('-', str_replace('_', '-', $lang))[0];
            if (isset($localeMap[$baseLang])) {
                return $localeMap[$baseLang];
            }
        }
        
        return null;
    }
}
