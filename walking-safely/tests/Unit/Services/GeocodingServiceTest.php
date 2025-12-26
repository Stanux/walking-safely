<?php

namespace Tests\Unit\Services;

use App\Contracts\MapAdapterInterface;
use App\Exceptions\MapProviderException;
use App\Services\GeocodingService;
use App\ValueObjects\Address;
use App\ValueObjects\Coordinates;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

class GeocodingServiceTest extends TestCase
{
    private GeocodingService $geocodingService;
    private MapAdapterInterface $mapAdapterMock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mapAdapterMock = Mockery::mock(MapAdapterInterface::class);
        $this->geocodingService = new GeocodingService($this->mapAdapterMock);

        // Clear cache before each test
        Cache::flush();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Test geocode returns results from provider and caches them.
     * @see Requirement 9.1
     */
    public function test_geocode_returns_results_from_provider(): void
    {
        $address = 'Avenida Paulista, São Paulo';
        $expectedResults = [
            $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544),
            $this->createAddress('Avenida Paulista, 2000, São Paulo', -23.5589, -46.6620),
        ];

        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once()
            ->andReturn($expectedResults);

        $results = $this->geocodingService->geocode($address);

        $this->assertCount(2, $results);
        $this->assertEquals($expectedResults[0]->formattedAddress, $results[0]->formattedAddress);
    }

    /**
     * Test geocode limits results to 5.
     * @see Requirement 9.1
     */
    public function test_geocode_limits_results_to_five(): void
    {
        $address = 'São Paulo';
        $manyResults = [];
        for ($i = 0; $i < 10; $i++) {
            $manyResults[] = $this->createAddress("Address {$i}, São Paulo", -23.5 + ($i * 0.01), -46.6);
        }

        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once()
            ->andReturn($manyResults);

        $results = $this->geocodingService->geocode($address);

        $this->assertCount(GeocodingService::MAX_RESULTS, $results);
    }

    /**
     * Test geocode returns cached results on second call.
     * @see Requirement 17.5
     */
    public function test_geocode_returns_cached_results(): void
    {
        $address = 'Avenida Paulista, São Paulo';
        $expectedResults = [
            $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544),
        ];

        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once() // Should only be called once
            ->andReturn($expectedResults);

        // First call - should hit provider
        $results1 = $this->geocodingService->geocode($address);

        // Second call - should hit cache
        $results2 = $this->geocodingService->geocode($address);

        $this->assertCount(1, $results1);
        $this->assertCount(1, $results2);
        $this->assertEquals($results1[0]->formattedAddress, $results2[0]->formattedAddress);
    }

    /**
     * Test geocode falls back to cache when provider fails.
     * @see Requirement 9.3
     */
    public function test_geocode_falls_back_to_cache_on_provider_failure(): void
    {
        $address = 'Avenida Paulista, São Paulo';
        $expectedResults = [
            $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544),
        ];

        // First call succeeds and caches
        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once()
            ->andReturn($expectedResults);

        $results1 = $this->geocodingService->geocode($address);

        // Clear primary cache to simulate expiration
        $normalizedAddress = mb_strtolower(trim($address));
        Cache::forget('geocode_' . md5($normalizedAddress));

        // Second call fails but should use fallback cache
        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once()
            ->andThrow(MapProviderException::unavailable('google'));

        $results2 = $this->geocodingService->geocode($address);

        $this->assertCount(1, $results2);
        $this->assertEquals($results1[0]->formattedAddress, $results2[0]->formattedAddress);
    }

    /**
     * Test geocode throws exception when provider fails and no cache available.
     */
    public function test_geocode_throws_exception_when_no_cache_available(): void
    {
        $address = 'Unknown Address';

        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->once()
            ->andThrow(MapProviderException::unavailable('google'));

        $this->expectException(MapProviderException::class);

        $this->geocodingService->geocode($address);
    }

    /**
     * Test reverse geocode returns result from provider and caches it.
     */
    public function test_reverse_geocode_returns_result_from_provider(): void
    {
        $coordinates = new Coordinates(-23.5629, -46.6544);
        $expectedResult = $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544);

        $this->mapAdapterMock
            ->shouldReceive('reverseGeocode')
            ->with(Mockery::type(Coordinates::class))
            ->once()
            ->andReturn($expectedResult);

        $result = $this->geocodingService->reverseGeocode($coordinates);

        $this->assertEquals($expectedResult->formattedAddress, $result->formattedAddress);
    }

    /**
     * Test reverse geocode returns cached result on second call.
     */
    public function test_reverse_geocode_returns_cached_result(): void
    {
        $coordinates = new Coordinates(-23.5629, -46.6544);
        $expectedResult = $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544);

        $this->mapAdapterMock
            ->shouldReceive('reverseGeocode')
            ->with(Mockery::type(Coordinates::class))
            ->once() // Should only be called once
            ->andReturn($expectedResult);

        // First call - should hit provider
        $result1 = $this->geocodingService->reverseGeocode($coordinates);

        // Second call - should hit cache
        $result2 = $this->geocodingService->reverseGeocode($coordinates);

        $this->assertEquals($result1->formattedAddress, $result2->formattedAddress);
    }

    /**
     * Test reverse geocode falls back to cache when provider fails.
     * @see Requirement 9.3
     */
    public function test_reverse_geocode_falls_back_to_cache_on_provider_failure(): void
    {
        $coordinates = new Coordinates(-23.5629, -46.6544);
        $expectedResult = $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544);

        // First call succeeds and caches
        $this->mapAdapterMock
            ->shouldReceive('reverseGeocode')
            ->with(Mockery::type(Coordinates::class))
            ->once()
            ->andReturn($expectedResult);

        $result1 = $this->geocodingService->reverseGeocode($coordinates);

        // Clear primary cache to simulate expiration
        $cacheKey = sprintf('reverse_geocode_%.6f_%.6f', $coordinates->latitude, $coordinates->longitude);
        Cache::forget($cacheKey);

        // Second call fails but should use fallback cache
        $this->mapAdapterMock
            ->shouldReceive('reverseGeocode')
            ->with(Mockery::type(Coordinates::class))
            ->once()
            ->andThrow(MapProviderException::unavailable('google'));

        $result2 = $this->geocodingService->reverseGeocode($coordinates);

        $this->assertEquals($result1->formattedAddress, $result2->formattedAddress);
    }

    /**
     * Test clear cache removes both primary and fallback cache.
     */
    public function test_clear_cache_removes_cached_results(): void
    {
        $address = 'Avenida Paulista, São Paulo';
        $expectedResults = [
            $this->createAddress('Avenida Paulista, 1000, São Paulo', -23.5629, -46.6544),
        ];

        $this->mapAdapterMock
            ->shouldReceive('geocode')
            ->with($address)
            ->twice() // Should be called twice after cache clear
            ->andReturn($expectedResults);

        // First call - caches result
        $this->geocodingService->geocode($address);

        // Clear cache
        $this->geocodingService->clearCache($address);

        // Second call - should hit provider again
        $results = $this->geocodingService->geocode($address);

        $this->assertCount(1, $results);
    }

    /**
     * Helper method to create an Address instance.
     */
    private function createAddress(string $formattedAddress, float $lat, float $lng): Address
    {
        return Address::fromArray([
            'formatted_address' => $formattedAddress,
            'coordinates' => new Coordinates($lat, $lng),
            'city' => 'São Paulo',
            'state' => 'SP',
            'country' => 'Brazil',
        ]);
    }
}
