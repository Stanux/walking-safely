<?php

namespace App\Services\MapAdapters;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Manages API quota tracking and throttling for map providers.
 *
 * @see Requirement 17.2 - Reduce external API calls by 50% when quota reaches 80%
 */
class QuotaManager
{
    /**
     * Cache key prefix for quota tracking.
     */
    private const CACHE_PREFIX = 'map_quota_';

    /**
     * Threshold percentage at which to start throttling.
     */
    private const THROTTLE_THRESHOLD = 80;

    /**
     * Reduction factor when throttling (50% reduction).
     */
    private const THROTTLE_REDUCTION = 0.5;

    /**
     * Default monthly quota limit per provider.
     */
    private array $quotaLimits;

    /**
     * Alert thresholds for cost monitoring.
     */
    private array $costAlertThresholds;

    public function __construct()
    {
        $this->quotaLimits = [
            'google' => (int) config('services.google_maps.monthly_quota', 100000),
            'here' => (int) config('services.here_maps.monthly_quota', 100000),
            'mapbox' => (int) config('services.mapbox.monthly_quota', 100000),
        ];

        $this->costAlertThresholds = [
            'google' => (float) config('services.google_maps.cost_alert_threshold', 100.0),
            'here' => (float) config('services.here_maps.cost_alert_threshold', 100.0),
            'mapbox' => (float) config('services.mapbox.cost_alert_threshold', 100.0),
        ];
    }

    /**
     * Record an API call for quota tracking.
     *
     * @param string $provider Provider name
     * @param string $operation Operation type (route, geocode, traffic)
     * @param float $cost Estimated cost of the operation
     */
    public function recordCall(string $provider, string $operation, float $cost = 0.0): void
    {
        try {
            $monthKey = $this->getMonthKey($provider);
            $dayKey = $this->getDayKey($provider);

            // Increment monthly counter
            $monthlyCount = Cache::increment($monthKey);
            if ($monthlyCount === 1) {
                // Set expiry to end of month
                Cache::put($monthKey, 1, $this->getEndOfMonth());
            }

            // Increment daily counter
            $dailyCount = Cache::increment($dayKey);
            if ($dailyCount === 1) {
                // Set expiry to end of day
                Cache::put($dayKey, 1, now()->endOfDay());
            }

            // Track cost
            $this->recordCost($provider, $cost);

            // Log operation
            Log::debug("Map API call recorded", [
                'provider' => $provider,
                'operation' => $operation,
                'monthly_count' => $monthlyCount,
                'daily_count' => $dailyCount,
                'cost' => $cost,
            ]);

            // Check for alerts
            $this->checkAlerts($provider);
        } catch (\Exception $e) {
            // Se o cache falhar, apenas loga e continua
            Log::warning("QuotaManager cache error, continuing without tracking", [
                'provider' => $provider,
                'operation' => $operation,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if calls should be throttled for a provider.
     *
     * @param string $provider Provider name
     * @return bool True if calls should be throttled
     */
    public function shouldThrottle(string $provider): bool
    {
        $usage = $this->getUsagePercentage($provider);
        return $usage >= self::THROTTLE_THRESHOLD;
    }

    /**
     * Check if a call should be allowed based on throttling.
     *
     * When throttling is active, only 50% of calls are allowed.
     *
     * @param string $provider Provider name
     * @return bool True if the call should proceed
     */
    public function shouldAllowCall(string $provider): bool
    {
        if (!$this->shouldThrottle($provider)) {
            return true;
        }

        // When throttling, randomly allow only 50% of calls
        return mt_rand(1, 100) <= (100 * self::THROTTLE_REDUCTION);
    }

    /**
     * Get current usage percentage for a provider.
     *
     * @param string $provider Provider name
     * @return float Usage percentage (0-100)
     */
    public function getUsagePercentage(string $provider): float
    {
        $limit = $this->quotaLimits[$provider] ?? 100000;
        $usage = $this->getMonthlyUsage($provider);

        return min(100, ($usage / $limit) * 100);
    }

    /**
     * Get monthly usage count for a provider.
     *
     * @param string $provider Provider name
     * @return int Number of API calls this month
     */
    public function getMonthlyUsage(string $provider): int
    {
        try {
            return (int) Cache::get($this->getMonthKey($provider), 0);
        } catch (\Exception $e) {
            Log::warning("QuotaManager cache error getting monthly usage", [
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get daily usage count for a provider.
     *
     * @param string $provider Provider name
     * @return int Number of API calls today
     */
    public function getDailyUsage(string $provider): int
    {
        try {
            return (int) Cache::get($this->getDayKey($provider), 0);
        } catch (\Exception $e) {
            Log::warning("QuotaManager cache error getting daily usage", [
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get monthly cost for a provider.
     *
     * @param string $provider Provider name
     * @return float Total cost this month
     */
    public function getMonthlyCost(string $provider): float
    {
        try {
            return (float) Cache::get($this->getCostKey($provider), 0.0);
        } catch (\Exception $e) {
            Log::warning("QuotaManager cache error getting monthly cost", [
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);
            return 0.0;
        }
    }

    /**
     * Get quota statistics for all providers.
     *
     * @return array Statistics for each provider
     */
    public function getStatistics(): array
    {
        $stats = [];

        foreach (array_keys($this->quotaLimits) as $provider) {
            $stats[$provider] = [
                'monthly_usage' => $this->getMonthlyUsage($provider),
                'monthly_limit' => $this->quotaLimits[$provider],
                'usage_percentage' => $this->getUsagePercentage($provider),
                'daily_usage' => $this->getDailyUsage($provider),
                'monthly_cost' => $this->getMonthlyCost($provider),
                'cost_threshold' => $this->costAlertThresholds[$provider],
                'is_throttled' => $this->shouldThrottle($provider),
            ];
        }

        return $stats;
    }

    /**
     * Set quota limit for a provider.
     *
     * @param string $provider Provider name
     * @param int $limit Monthly quota limit
     */
    public function setQuotaLimit(string $provider, int $limit): void
    {
        $this->quotaLimits[$provider] = $limit;
    }

    /**
     * Set cost alert threshold for a provider.
     *
     * @param string $provider Provider name
     * @param float $threshold Cost threshold in currency units
     */
    public function setCostAlertThreshold(string $provider, float $threshold): void
    {
        $this->costAlertThresholds[$provider] = $threshold;
    }

    /**
     * Record cost for a provider.
     */
    private function recordCost(string $provider, float $cost): void
    {
        if ($cost <= 0) {
            return;
        }

        try {
            $costKey = $this->getCostKey($provider);
            $currentCost = (float) Cache::get($costKey, 0.0);
            $newCost = $currentCost + $cost;

            Cache::put($costKey, $newCost, $this->getEndOfMonth());
        } catch (\Exception $e) {
            Log::warning("QuotaManager cache error recording cost", [
                'provider' => $provider,
                'cost' => $cost,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check and trigger alerts if thresholds are exceeded.
     */
    private function checkAlerts(string $provider): void
    {
        // Check quota alert
        $usage = $this->getUsagePercentage($provider);
        if ($usage >= self::THROTTLE_THRESHOLD) {
            Log::warning("Map API quota threshold reached", [
                'provider' => $provider,
                'usage_percentage' => $usage,
                'threshold' => self::THROTTLE_THRESHOLD,
            ]);
        }

        // Check cost alert
        $cost = $this->getMonthlyCost($provider);
        $threshold = $this->costAlertThresholds[$provider] ?? PHP_FLOAT_MAX;
        if ($cost >= $threshold) {
            Log::warning("Map API cost threshold exceeded", [
                'provider' => $provider,
                'monthly_cost' => $cost,
                'threshold' => $threshold,
            ]);
        }
    }

    /**
     * Get cache key for monthly usage.
     */
    private function getMonthKey(string $provider): string
    {
        return self::CACHE_PREFIX . $provider . '_month_' . now()->format('Y_m');
    }

    /**
     * Get cache key for daily usage.
     */
    private function getDayKey(string $provider): string
    {
        return self::CACHE_PREFIX . $provider . '_day_' . now()->format('Y_m_d');
    }

    /**
     * Get cache key for monthly cost.
     */
    private function getCostKey(string $provider): string
    {
        return self::CACHE_PREFIX . $provider . '_cost_' . now()->format('Y_m');
    }

    /**
     * Get end of current month as Carbon instance.
     */
    private function getEndOfMonth(): \DateTimeInterface
    {
        return now()->endOfMonth();
    }
}
