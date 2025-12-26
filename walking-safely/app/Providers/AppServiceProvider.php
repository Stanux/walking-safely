<?php

namespace App\Providers;

use App\Contracts\MapAdapterInterface;
use App\Services\MapAdapters\MapAdapterFactory;
use App\Services\MapAdapters\QuotaManager;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register QuotaManager as singleton
        $this->app->singleton(QuotaManager::class, function ($app) {
            return new QuotaManager();
        });

        // Register MapAdapterFactory as singleton
        $this->app->singleton(MapAdapterFactory::class, function ($app) {
            return new MapAdapterFactory($app->make(QuotaManager::class));
        });

        // Register MapAdapterInterface to use the adapter with fallback
        $this->app->bind(MapAdapterInterface::class, function ($app) {
            return $app->make(MapAdapterFactory::class)->getAdapterWithFallback();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
