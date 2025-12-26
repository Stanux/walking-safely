<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('crime_type_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crime_type_id')->constrained('crime_types')->cascadeOnDelete();
            $table->string('locale', 10)->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['crime_type_id', 'locale']);
        });

        Schema::create('crime_category_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crime_category_id')->constrained('crime_categories')->cascadeOnDelete();
            $table->string('locale', 10)->index();
            $table->string('name');
            $table->timestamps();

            $table->unique(['crime_category_id', 'locale']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crime_category_translations');
        Schema::dropIfExists('crime_type_translations');
    }
};
