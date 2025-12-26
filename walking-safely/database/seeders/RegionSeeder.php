<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RegionSeeder extends Seeder
{
    /**
     * Seed regions for Florianópolis area.
     */
    public function run(): void
    {
        // Create regions covering Florianópolis area
        // Each region is approximately 1km x 1km
        
        $baseLatitude = -27.62;  // Approximate center
        $baseLongitude = -48.67;
        
        $regionSize = 0.01; // Approximately 1km
        $gridSize = 5; // 5x5 grid = 25 regions
        
        $regionId = 1;
        
        for ($i = -$gridSize; $i <= $gridSize; $i++) {
            for ($j = -$gridSize; $j <= $gridSize; $j++) {
                $centerLat = $baseLatitude + ($i * $regionSize);
                $centerLng = $baseLongitude + ($j * $regionSize);
                
                // Create a square polygon around the center
                $halfSize = $regionSize / 2;
                $minLat = $centerLat - $halfSize;
                $maxLat = $centerLat + $halfSize;
                $minLng = $centerLng - $halfSize;
                $maxLng = $centerLng + $halfSize;
                
                // WKT format for polygon (note: must close the ring)
                $polygon = sprintf(
                    'POLYGON((%f %f, %f %f, %f %f, %f %f, %f %f))',
                    $minLng, $minLat,  // SW
                    $maxLng, $minLat,  // SE
                    $maxLng, $maxLat,  // NE
                    $minLng, $maxLat,  // NW
                    $minLng, $minLat   // Close ring (back to SW)
                );
                
                $name = sprintf('Region_%d_%d', $i + $gridSize, $j + $gridSize);
                
                DB::table('regions')->updateOrInsert(
                    ['name' => $name],
                    [
                        'name' => $name,
                        'boundary' => DB::raw("ST_GeomFromText('$polygon', 4326)"),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
                
                $regionId++;
            }
        }
        
        $this->command->info('Created ' . (($gridSize * 2 + 1) ** 2) . ' regions covering Florianópolis area!');
    }
}
