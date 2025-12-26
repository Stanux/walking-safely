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
        Schema::create('risk_indexes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained('regions')->cascadeOnDelete();
            $table->float('value')->default(0); // Risk index value 0-100
            $table->timestamp('calculated_at');
            $table->json('factors')->nullable(); // JSON array of RiskFactor objects
            $table->integer('occurrence_count')->default(0);
            $table->foreignId('dominant_crime_type_id')->nullable()->constrained('crime_types')->nullOnDelete();
            $table->timestamps();

            $table->unique('region_id');
            $table->index('value');
            $table->index('calculated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('risk_indexes');
    }
};
