<?php

namespace App\Services;

use App\Models\Region;
use App\ValueObjects\Coordinates;
use Illuminate\Support\Facades\DB;

class DynamicRegionService
{
    /**
     * Tamanho da região em graus (aproximadamente 1km)
     */
    private const REGION_SIZE = 0.01;

    /**
     * Encontra ou cria uma região para as coordenadas dadas.
     */
    public function findOrCreateRegionForCoordinates(Coordinates $coordinates): int
    {
        // Primeiro tenta encontrar região existente
        $existingRegion = $this->findExistingRegion($coordinates);
        if ($existingRegion) {
            return $existingRegion->id;
        }

        // Se não encontrar, cria uma nova região
        return $this->createRegionForCoordinates($coordinates);
    }

    /**
     * Procura região existente que contenha as coordenadas.
     */
    private function findExistingRegion(Coordinates $coordinates): ?Region
    {
        $point = $coordinates->toPoint();

        return Region::query()
            ->whereContains('boundary', $point)
            ->first();
    }

    /**
     * Cria uma nova região centrada nas coordenadas.
     */
    private function createRegionForCoordinates(Coordinates $coordinates): int
    {
        // Calcula os limites da região (quadrado de 1km x 1km)
        $centerLat = $coordinates->latitude;
        $centerLng = $coordinates->longitude;
        
        // Arredonda para a grade mais próxima
        $gridLat = round($centerLat / self::REGION_SIZE) * self::REGION_SIZE;
        $gridLng = round($centerLng / self::REGION_SIZE) * self::REGION_SIZE;
        
        $halfSize = self::REGION_SIZE / 2;
        $minLat = $gridLat - $halfSize;
        $maxLat = $gridLat + $halfSize;
        $minLng = $gridLng - $halfSize;
        $maxLng = $gridLng + $halfSize;

        // Cria o polígono WKT
        $polygon = sprintf(
            'POLYGON((%f %f, %f %f, %f %f, %f %f, %f %f))',
            $minLng, $minLat,  // SW
            $maxLng, $minLat,  // SE
            $maxLng, $maxLat,  // NE
            $minLng, $maxLat,  // NW
            $minLng, $minLat   // Close ring
        );

        // Nome baseado nas coordenadas
        $name = sprintf('Auto_Region_%s_%s', 
            str_replace(['.', '-'], '_', (string)$gridLat),
            str_replace(['.', '-'], '_', (string)$gridLng)
        );

        // Cria a região
        $region = Region::create([
            'name' => $name,
            'boundary' => DB::raw("ST_GeomFromText('$polygon', 4326)"),
            'type' => 'auto_generated',
        ]);

        return $region->id;
    }

    /**
     * Cria regiões para uma cidade inteira.
     */
    public function createRegionsForCity(string $cityName, Coordinates $center, int $gridSize = 10): int
    {
        $created = 0;
        
        for ($i = -$gridSize; $i <= $gridSize; $i++) {
            for ($j = -$gridSize; $j <= $gridSize; $j++) {
                $regionCenter = new Coordinates(
                    $center->latitude + ($i * self::REGION_SIZE),
                    $center->longitude + ($j * self::REGION_SIZE)
                );
                
                // Verifica se já existe região nesta posição
                if (!$this->findExistingRegion($regionCenter)) {
                    $this->createRegionForCoordinates($regionCenter);
                    $created++;
                }
            }
        }
        
        return $created;
    }
}