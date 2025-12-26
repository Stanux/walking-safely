<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\NavigationSession;
use App\Models\User;
use App\Services\LocationPermissionService;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

/**
 * Tests for LocationPermissionService.
 *
 * @see Requirement 15.1 - Use location data only during active session
 * @see Requirement 15.3 - Clear location data on permission revocation
 */
class LocationPermissionServiceTest extends TestCase
{
    private LocationPermissionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LocationPermissionService();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_has_permission_returns_true_when_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->location_permission_granted = true;

        $this->assertTrue($this->service->hasPermission($user));
    }

    public function test_has_permission_returns_false_when_not_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->location_permission_granted = false;

        $this->assertFalse($this->service->hasPermission($user));
    }

    public function test_has_permission_returns_false_when_null(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->location_permission_granted = null;

        $this->assertFalse($this->service->hasPermission($user));
    }

    public function test_cache_user_location_stores_data_when_permission_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->id = 123;
        $user->location_permission_granted = true;

        Cache::shouldReceive('put')
            ->once()
            ->with(LocationPermissionService::LOCATION_CACHE_PREFIX . '123', ['lat' => 1, 'lng' => 2], 300)
            ->andReturn(true);

        $result = $this->service->cacheUserLocation($user, ['lat' => 1, 'lng' => 2]);

        $this->assertTrue($result);
    }

    public function test_cache_user_location_fails_when_permission_not_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->id = 123;
        $user->location_permission_granted = false;

        Cache::shouldReceive('put')->never();

        $result = $this->service->cacheUserLocation($user, ['lat' => 1, 'lng' => 2]);

        $this->assertFalse($result);
    }

    public function test_get_cached_user_location_returns_data_when_permission_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->id = 123;
        $user->location_permission_granted = true;

        $location = ['latitude' => -23.5505, 'longitude' => -46.6333];

        Cache::shouldReceive('get')
            ->once()
            ->with(LocationPermissionService::LOCATION_CACHE_PREFIX . '123')
            ->andReturn($location);

        $result = $this->service->getCachedUserLocation($user);

        $this->assertEquals($location, $result);
    }

    public function test_get_cached_user_location_returns_null_when_permission_not_granted(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->id = 123;
        $user->location_permission_granted = false;

        Cache::shouldReceive('get')->never();

        $result = $this->service->getCachedUserLocation($user);

        $this->assertNull($result);
    }

    public function test_clear_user_location_cache_clears_all_location_keys(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->id = 456;

        // Expect all cache keys to be cleared
        Cache::shouldReceive('forget')
            ->once()
            ->with(LocationPermissionService::LOCATION_CACHE_PREFIX . '456');

        Cache::shouldReceive('forget')
            ->once()
            ->with(LocationPermissionService::ROUTE_CACHE_PREFIX . '456');

        Cache::shouldReceive('forget')
            ->once()
            ->with(LocationPermissionService::GEOCODING_CACHE_PREFIX . '456');

        Cache::shouldReceive('forget')
            ->once()
            ->with('navigation_session:456');

        Cache::shouldReceive('forget')
            ->once()
            ->with('recent_locations:456');

        Cache::shouldReceive('forget')
            ->once()
            ->with('route_history:456');

        Cache::shouldReceive('forget')
            ->once()
            ->with('alert_position:456');

        $this->service->clearUserLocationCache($user);

        // Assert that the method completed without errors
        $this->assertTrue(true);
    }

    public function test_cache_key_prefixes_are_defined(): void
    {
        $this->assertEquals('user_location:', LocationPermissionService::LOCATION_CACHE_PREFIX);
        $this->assertEquals('user_route:', LocationPermissionService::ROUTE_CACHE_PREFIX);
        $this->assertEquals('user_geocoding:', LocationPermissionService::GEOCODING_CACHE_PREFIX);
    }
}
