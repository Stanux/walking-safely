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
        Schema::create('occurrences', function (Blueprint $table) {
            $table->id();
            $table->timestamp('timestamp');
            $table->geometry('location', subtype: 'point', srid: 4326);
            $table->foreignId('crime_type_id')->constrained('crime_types')->cascadeOnDelete();
            $table->string('severity'); // low, medium, high, critical
            $table->unsignedTinyInteger('confidence_score')->default(2); // 1-5
            $table->string('source'); // collaborative, official
            $table->string('source_id')->nullable(); // External source identifier
            $table->foreignId('region_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->string('status')->default('active'); // active, expired, rejected, merged
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('merged_into_id')->nullable()->constrained('occurrences')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->spatialIndex('location');
            $table->index('crime_type_id');
            $table->index('region_id');
            $table->index('status');
            $table->index('source');
            $table->index('timestamp');
            $table->index('expires_at');
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('occurrences');
    }
};
