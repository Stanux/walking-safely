<?php

use App\Http\Controllers\Api\RouteController;
use App\Http\Controllers\Api\OccurrenceController;
use App\Http\Controllers\Api\GeocodingController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\HeatmapController;
use App\Http\Controllers\Api\TimeSeriesController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
|--------------------------------------------------------------------------
| API Info Route
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return response()->json([
        'name' => 'Walking Safely API',
        'version' => '1.0.0',
        'status' => 'online',
        'endpoints' => [
            'auth' => '/api/auth',
            'routes' => '/api/routes',
            'occurrences' => '/api/occurrences',
            'heatmap' => '/api/heatmap',
            'alerts' => '/api/alerts',
            'timeseries' => '/api/timeseries',
            'analytics' => '/api/analytics',
            'admin' => '/api/admin',
        ]
    ]);
});

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum')->name('auth.logout');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum')->name('auth.me');
});

/*
|--------------------------------------------------------------------------
| Route Calculation Routes
|--------------------------------------------------------------------------
*/
Route::prefix('routes')->group(function () {
    Route::post('/', [RouteController::class, 'calculate'])->name('routes.calculate');
    Route::post('/recalculate', [RouteController::class, 'recalculate'])->name('routes.recalculate');
});

/*
|--------------------------------------------------------------------------
| Occurrence Routes
|--------------------------------------------------------------------------
*/
Route::prefix('occurrences')->group(function () {
    Route::get('/', [OccurrenceController::class, 'index'])->name('occurrences.index');
    Route::post('/', [OccurrenceController::class, 'store'])->name('occurrences.store');
    Route::get('/{id}', [OccurrenceController::class, 'show'])->name('occurrences.show');
});

/*
|--------------------------------------------------------------------------
| Geocoding Routes
|--------------------------------------------------------------------------
*/
Route::get('/geocode', [GeocodingController::class, 'geocode'])->name('geocode');
Route::get('/reverse-geocode', [GeocodingController::class, 'reverseGeocode'])->name('reverse-geocode');

/*
|--------------------------------------------------------------------------
| Alert Routes
|--------------------------------------------------------------------------
*/
Route::prefix('alerts')->group(function () {
    Route::get('/check', [AlertController::class, 'check'])->name('alerts.check');
    Route::get('/preferences', [AlertController::class, 'getPreferences'])->name('alerts.preferences.get');
    Route::put('/preferences', [AlertController::class, 'updatePreferences'])->name('alerts.preferences.update');
});

/*
|--------------------------------------------------------------------------
| Heatmap Routes
|--------------------------------------------------------------------------
*/
Route::prefix('heatmap')->group(function () {
    Route::get('/', [HeatmapController::class, 'index'])->name('heatmap.index');
    Route::get('/regions', [HeatmapController::class, 'byRegion'])->name('heatmap.regions');
    Route::get('/distribution', [HeatmapController::class, 'distribution'])->name('heatmap.distribution');
});

/*
|--------------------------------------------------------------------------
| Time Series Routes
|--------------------------------------------------------------------------
*/
Route::prefix('timeseries')->group(function () {
    Route::get('/', [TimeSeriesController::class, 'index'])->name('timeseries.index');
    Route::get('/hourly', [TimeSeriesController::class, 'hourlyPattern'])->name('timeseries.hourly');
    Route::get('/daily', [TimeSeriesController::class, 'dayOfWeekPattern'])->name('timeseries.daily');
    Route::get('/heatmap', [TimeSeriesController::class, 'hourDayHeatmap'])->name('timeseries.heatmap');
});


/*
|--------------------------------------------------------------------------
| Analytics Routes (Protected)
|--------------------------------------------------------------------------
*/
Route::prefix('analytics')->middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [App\Http\Controllers\Api\AnalyticsController::class, 'dashboard'])->name('analytics.dashboard');
    Route::get('/summary', [App\Http\Controllers\Api\AnalyticsController::class, 'summary'])->name('analytics.summary');
    Route::get('/distribution/type', [App\Http\Controllers\Api\AnalyticsController::class, 'distributionByType'])->name('analytics.distribution.type');
    Route::get('/distribution/region', [App\Http\Controllers\Api\AnalyticsController::class, 'distributionByRegion'])->name('analytics.distribution.region');
    Route::get('/trends', [App\Http\Controllers\Api\AnalyticsController::class, 'trends'])->name('analytics.trends');
    Route::get('/quality', [App\Http\Controllers\Api\AnalyticsController::class, 'quality'])->name('analytics.quality');
    Route::get('/moderation', [App\Http\Controllers\Api\AnalyticsController::class, 'moderation'])->name('analytics.moderation');
    Route::get('/export', [App\Http\Controllers\Api\AnalyticsController::class, 'export'])->name('analytics.export');
});

/*
|--------------------------------------------------------------------------
| Admin Routes (Protected)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    // Moderation
    Route::get('/moderation', [App\Http\Controllers\Api\AdminController::class, 'getModerationQueue'])->name('admin.moderation.index');
    Route::post('/moderation/{id}/approve', [App\Http\Controllers\Api\AdminController::class, 'approveModeration'])->name('admin.moderation.approve');
    Route::post('/moderation/{id}/reject', [App\Http\Controllers\Api\AdminController::class, 'rejectModeration'])->name('admin.moderation.reject');

    // Taxonomy
    Route::get('/taxonomy/categories', [App\Http\Controllers\Api\AdminController::class, 'getCategories'])->name('admin.taxonomy.categories');
    Route::post('/taxonomy/categories', [App\Http\Controllers\Api\AdminController::class, 'createCategory'])->name('admin.taxonomy.categories.create');
    Route::put('/taxonomy/categories/{id}', [App\Http\Controllers\Api\AdminController::class, 'updateCategory'])->name('admin.taxonomy.categories.update');

    // Translations
    Route::get('/translations', [App\Http\Controllers\Api\AdminController::class, 'getTranslations'])->name('admin.translations.index');
    Route::put('/translations', [App\Http\Controllers\Api\AdminController::class, 'updateTranslation'])->name('admin.translations.update');
    Route::get('/translations/export', [App\Http\Controllers\Api\AdminController::class, 'exportTranslations'])->name('admin.translations.export');
    Route::post('/translations/import', [App\Http\Controllers\Api\AdminController::class, 'importTranslations'])->name('admin.translations.import');
});
