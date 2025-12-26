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
        Schema::create('external_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crime_type_id')->constrained('crime_types')->cascadeOnDelete();
            $table->string('source');
            $table->string('external_code');
            $table->string('external_name');
            $table->timestamps();

            $table->unique(['source', 'external_code']);
            $table->index('crime_type_id');
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_mappings');
    }
};
