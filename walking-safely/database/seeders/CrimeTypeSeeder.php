<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CrimeTypeSeeder extends Seeder
{
    /**
     * Seed the crime categories and types.
     */
    public function run(): void
    {
        // Create crime categories
        $categories = [
            ['id' => 1, 'name' => 'Property Crimes', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'Violent Crimes', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'Public Order', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'name' => 'Other', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($categories as $category) {
            DB::table('crime_categories')->updateOrInsert(
                ['id' => $category['id']],
                $category
            );
        }

        // Create crime types
        $crimeTypes = [
            ['id' => 1, 'category_id' => 1, 'name' => 'Robbery', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'category_id' => 1, 'name' => 'Theft', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'category_id' => 2, 'name' => 'Assault', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'category_id' => 2, 'name' => 'Harassment', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'category_id' => 3, 'name' => 'Vandalism', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 6, 'category_id' => 4, 'name' => 'Suspicious Activity', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($crimeTypes as $crimeType) {
            DB::table('crime_types')->updateOrInsert(
                ['id' => $crimeType['id']],
                $crimeType
            );
        }

        // Create translations for Portuguese
        $translations = [
            ['crime_type_id' => 1, 'locale' => 'pt_BR', 'name' => 'Roubo', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 2, 'locale' => 'pt_BR', 'name' => 'Furto', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 3, 'locale' => 'pt_BR', 'name' => 'Agressão', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 4, 'locale' => 'pt_BR', 'name' => 'Assédio', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 5, 'locale' => 'pt_BR', 'name' => 'Vandalismo', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 6, 'locale' => 'pt_BR', 'name' => 'Atividade Suspeita', 'created_at' => now(), 'updated_at' => now()],
            // English translations
            ['crime_type_id' => 1, 'locale' => 'en', 'name' => 'Robbery', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 2, 'locale' => 'en', 'name' => 'Theft', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 3, 'locale' => 'en', 'name' => 'Assault', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 4, 'locale' => 'en', 'name' => 'Harassment', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 5, 'locale' => 'en', 'name' => 'Vandalism', 'created_at' => now(), 'updated_at' => now()],
            ['crime_type_id' => 6, 'locale' => 'en', 'name' => 'Suspicious Activity', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($translations as $translation) {
            DB::table('crime_type_translations')->updateOrInsert(
                ['crime_type_id' => $translation['crime_type_id'], 'locale' => $translation['locale']],
                $translation
            );
        }

        $this->command->info('Crime categories and types seeded successfully!');
    }
}
