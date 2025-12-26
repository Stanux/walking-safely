<?php

namespace Tests\Unit\Services;

use App\Services\I18nService;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class I18nServiceTest extends TestCase
{
    private I18nService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new I18nService();
    }

    public function test_get_supported_locales_returns_expected_locales(): void
    {
        $locales = $this->service->getSupportedLocales();

        $this->assertContains('pt_BR', $locales);
        $this->assertContains('en', $locales);
        $this->assertContains('es', $locales);
        $this->assertCount(3, $locales);
    }

    public function test_get_default_locale_returns_pt_br(): void
    {
        $this->assertEquals('pt_BR', $this->service->getDefaultLocale());
    }

    public function test_is_locale_supported_returns_true_for_supported_locales(): void
    {
        $this->assertTrue($this->service->isLocaleSupported('pt_BR'));
        $this->assertTrue($this->service->isLocaleSupported('en'));
        $this->assertTrue($this->service->isLocaleSupported('es'));
    }

    public function test_is_locale_supported_returns_false_for_unsupported_locales(): void
    {
        $this->assertFalse($this->service->isLocaleSupported('fr'));
        $this->assertFalse($this->service->isLocaleSupported('de'));
        $this->assertFalse($this->service->isLocaleSupported('invalid'));
        $this->assertFalse($this->service->isLocaleSupported(''));
    }

    public function test_get_current_locale_returns_app_locale(): void
    {
        App::setLocale('en');
        $this->assertEquals('en', $this->service->getCurrentLocale());

        App::setLocale('pt_BR');
        $this->assertEquals('pt_BR', $this->service->getCurrentLocale());

        App::setLocale('es');
        $this->assertEquals('es', $this->service->getCurrentLocale());
    }
}
