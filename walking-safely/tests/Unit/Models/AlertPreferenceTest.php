<?php

namespace Tests\Unit\Models;

use App\Models\AlertPreference;
use Carbon\Carbon;
use Tests\TestCase;

class AlertPreferenceTest extends TestCase
{
    /**
     * Test isCrimeTypeEnabled returns true when no specific types are set.
     */
    public function test_is_crime_type_enabled_returns_true_when_empty(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [],
        ]);

        $this->assertTrue($preference->isCrimeTypeEnabled(1));
        $this->assertTrue($preference->isCrimeTypeEnabled(999));
    }

    /**
     * Test isCrimeTypeEnabled returns true only for enabled types.
     */
    public function test_is_crime_type_enabled_filters_correctly(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [1, 2, 3],
        ]);

        $this->assertTrue($preference->isCrimeTypeEnabled(1));
        $this->assertTrue($preference->isCrimeTypeEnabled(2));
        $this->assertTrue($preference->isCrimeTypeEnabled(3));
        $this->assertFalse($preference->isCrimeTypeEnabled(4));
        $this->assertFalse($preference->isCrimeTypeEnabled(999));
    }

    /**
     * Test isActiveOnCurrentDay returns true when no specific days are set.
     */
    public function test_is_active_on_current_day_returns_true_when_empty(): void
    {
        $preference = new AlertPreference([
            'active_days' => [],
        ]);

        $this->assertTrue($preference->isActiveOnCurrentDay());
    }

    /**
     * Test isActiveOnCurrentDay filters by day correctly.
     */
    public function test_is_active_on_current_day_filters_correctly(): void
    {
        // Set to a known day (Monday = 1)
        Carbon::setTestNow(Carbon::create(2025, 12, 22, 12, 0, 0)); // Monday

        $preference = new AlertPreference([
            'active_days' => [AlertPreference::MONDAY, AlertPreference::FRIDAY],
        ]);

        $this->assertTrue($preference->isActiveOnCurrentDay());

        // Change to Tuesday
        Carbon::setTestNow(Carbon::create(2025, 12, 23, 12, 0, 0)); // Tuesday
        $this->assertFalse($preference->isActiveOnCurrentDay());

        Carbon::setTestNow(); // Reset
    }

    /**
     * Test isActiveAtCurrentHour returns true when no time restrictions.
     */
    public function test_is_active_at_current_hour_returns_true_when_no_restrictions(): void
    {
        $preference = new AlertPreference([
            'active_hours_start' => null,
            'active_hours_end' => null,
        ]);

        $this->assertTrue($preference->isActiveAtCurrentHour());
    }

    /**
     * Test isActiveAtCurrentHour filters by time correctly (normal range).
     */
    public function test_is_active_at_current_hour_normal_range(): void
    {
        Carbon::setTestNow(Carbon::create(2025, 12, 22, 14, 0, 0)); // 14:00

        $preference = new AlertPreference([
            'active_hours_start' => '08:00',
            'active_hours_end' => '18:00',
        ]);

        $this->assertTrue($preference->isActiveAtCurrentHour());

        // Test outside range
        Carbon::setTestNow(Carbon::create(2025, 12, 22, 20, 0, 0)); // 20:00
        $this->assertFalse($preference->isActiveAtCurrentHour());

        Carbon::setTestNow(); // Reset
    }

    /**
     * Test isActiveAtCurrentHour handles overnight ranges.
     */
    public function test_is_active_at_current_hour_overnight_range(): void
    {
        // Night time (22:00 to 06:00)
        $preference = new AlertPreference([
            'active_hours_start' => '22:00',
            'active_hours_end' => '06:00',
        ]);

        // Test at 23:00 (should be active)
        Carbon::setTestNow(Carbon::create(2025, 12, 22, 23, 0, 0));
        $this->assertTrue($preference->isActiveAtCurrentHour());

        // Test at 03:00 (should be active)
        Carbon::setTestNow(Carbon::create(2025, 12, 23, 3, 0, 0));
        $this->assertTrue($preference->isActiveAtCurrentHour());

        // Test at 12:00 (should not be active)
        Carbon::setTestNow(Carbon::create(2025, 12, 22, 12, 0, 0));
        $this->assertFalse($preference->isActiveAtCurrentHour());

        Carbon::setTestNow(); // Reset
    }

    /**
     * Test enableCrimeType adds crime type to list.
     */
    public function test_enable_crime_type(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [1, 2],
        ]);

        $preference->enableCrimeType(3);

        $this->assertTrue($preference->isCrimeTypeEnabled(3));
        $this->assertContains(3, $preference->enabled_crime_types);
    }

    /**
     * Test enableCrimeType does not duplicate.
     */
    public function test_enable_crime_type_no_duplicate(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [1, 2],
        ]);

        $preference->enableCrimeType(1);

        $this->assertCount(2, $preference->enabled_crime_types);
    }

    /**
     * Test disableCrimeType removes crime type from list.
     */
    public function test_disable_crime_type(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [1, 2, 3],
        ]);

        $preference->disableCrimeType(2);

        $this->assertFalse($preference->isCrimeTypeEnabled(2));
        $this->assertNotContains(2, $preference->enabled_crime_types);
    }

    /**
     * Test setActiveHours sets time restrictions.
     */
    public function test_set_active_hours(): void
    {
        $preference = new AlertPreference();

        $preference->setActiveHours('18:00', '06:00');

        $this->assertEquals('18:00', $preference->active_hours_start);
        $this->assertEquals('06:00', $preference->active_hours_end);
    }

    /**
     * Test setActiveDays validates and sets days.
     */
    public function test_set_active_days(): void
    {
        $preference = new AlertPreference();

        $preference->setActiveDays([0, 6, 1, 1]); // Sunday, Saturday, Monday (with duplicate)

        $this->assertCount(3, $preference->active_days);
        $this->assertContains(0, $preference->active_days);
        $this->assertContains(1, $preference->active_days);
        $this->assertContains(6, $preference->active_days);
    }

    /**
     * Test setActiveDays filters invalid days.
     */
    public function test_set_active_days_filters_invalid(): void
    {
        $preference = new AlertPreference();

        $preference->setActiveDays([0, 7, -1, 6]); // 7 and -1 are invalid

        $this->assertCount(2, $preference->active_days);
        $this->assertContains(0, $preference->active_days);
        $this->assertContains(6, $preference->active_days);
    }

    /**
     * Test enableNightOnlyAlerts sets correct hours.
     */
    public function test_enable_night_only_alerts(): void
    {
        $preference = new AlertPreference();

        $preference->enableNightOnlyAlerts();

        $this->assertEquals('18:00', $preference->active_hours_start);
        $this->assertEquals('06:00', $preference->active_hours_end);
    }

    /**
     * Test enableWeekendOnlyAlerts sets correct days.
     */
    public function test_enable_weekend_only_alerts(): void
    {
        $preference = new AlertPreference();

        $preference->enableWeekendOnlyAlerts();

        $this->assertCount(2, $preference->active_days);
        $this->assertContains(AlertPreference::SATURDAY, $preference->active_days);
        $this->assertContains(AlertPreference::SUNDAY, $preference->active_days);
    }

    /**
     * Test clearTimeRestrictions removes all time restrictions.
     */
    public function test_clear_time_restrictions(): void
    {
        $preference = new AlertPreference([
            'active_hours_start' => '18:00',
            'active_hours_end' => '06:00',
            'active_days' => [0, 6],
        ]);

        $preference->clearTimeRestrictions();

        $this->assertNull($preference->active_hours_start);
        $this->assertNull($preference->active_hours_end);
        $this->assertEmpty($preference->active_days);
    }

    /**
     * Test clearCrimeTypeRestrictions removes all crime type restrictions.
     */
    public function test_clear_crime_type_restrictions(): void
    {
        $preference = new AlertPreference([
            'enabled_crime_types' => [1, 2, 3],
        ]);

        $preference->clearCrimeTypeRestrictions();

        $this->assertEmpty($preference->enabled_crime_types);
        $this->assertTrue($preference->isCrimeTypeEnabled(999)); // All enabled
    }
}
