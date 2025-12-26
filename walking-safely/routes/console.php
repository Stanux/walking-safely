<?php

use App\Jobs\ExpireOldOccurrences;
use App\Jobs\RecalculateRiskIndex;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Jobs
|--------------------------------------------------------------------------
|
| Here you may define all of your scheduled jobs. These jobs will be
| executed according to the schedule you define.
|
*/

// Expire old collaborative occurrences daily at midnight
// Requirement 7.4: Expire collaborative reports after 7 days
Schedule::job(new ExpireOldOccurrences())->daily();

// Recalculate risk indexes for all regions daily at 2 AM
// Requirement 5.1: Maintain risk index for each region, updated at least every 24 hours
Schedule::job(RecalculateRiskIndex::forAllRegions())->dailyAt('02:00');
