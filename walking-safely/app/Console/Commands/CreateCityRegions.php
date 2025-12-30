<?php

namespace App\Console\Commands;

use App\Services\DynamicRegionService;
use App\ValueObjects\Coordinates;
use Illuminate\Console\Command;

class CreateCityRegions extends Command
{
    protected $signature = 'regions:create-city 
                           {city : Nome da cidade}
                           {latitude : Latitude do centro da cidade}
                           {longitude : Longitude do centro da cidade}
                           {--size=10 : Tamanho da grade (padrão: 10x10)}';

    protected $description = 'Cria regiões para uma cidade específica';

    public function handle(DynamicRegionService $regionService): int
    {
        $city = $this->argument('city');
        $latitude = (float) $this->argument('latitude');
        $longitude = (float) $this->argument('longitude');
        $gridSize = (int) $this->option('size');

        $this->info("Criando regiões para {$city}...");
        $this->info("Centro: {$latitude}, {$longitude}");
        $this->info("Grade: {$gridSize}x{$gridSize} = " . (($gridSize * 2 + 1) ** 2) . " regiões");

        $center = new Coordinates($latitude, $longitude);
        $created = $regionService->createRegionsForCity($city, $center, $gridSize);

        $this->info("✅ {$created} regiões criadas para {$city}!");

        return 0;
    }
}