<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Rota de teste para geocoding
Route::get('/test-geocoding', function () {
    try {
        $service = app(\App\Services\GeocodingService::class);
        $results = $service->geocode('vargem');
        
        return response()->json([
            'status' => 'success',
            'provider' => config('services.map_provider'),
            'results_count' => count($results),
            'results' => array_map(fn($r) => [
                'address' => $r->formattedAddress,
                'coordinates' => [
                    'lat' => $r->coordinates->latitude,
                    'lng' => $r->coordinates->longitude
                ]
            ], $results)
        ]);
    } catch (Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'class' => get_class($e)
        ], 500);
    }
});