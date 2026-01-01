<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Limpeza automática do cache de trânsito
        $schedule->command('traffic:cleanup-cache')
                 ->hourly()
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Limpeza mais agressiva durante madrugada
        $schedule->command('traffic:cleanup-cache --force')
                 ->dailyAt('03:00')
                 ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}