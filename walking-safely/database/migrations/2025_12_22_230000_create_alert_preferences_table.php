<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @see Requirement 6.3 - Enable/disable alerts by occurrence type
     * @see Requirement 6.5 - Define specific hours for alert activation
     */
    public function up(): void
    {
        Schema::create('alert_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('alerts_enabled')->default(true);
            $table->json('enabled_crime_types')->nullable(); // Array of crime type IDs, null = all enabled
            $table->string('active_hours_start', 5)->nullable(); // HH:MM format
            $table->string('active_hours_end', 5)->nullable(); // HH:MM format
            $table->json('active_days')->nullable(); // Array of day numbers (0-6), null = all days
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alert_preferences');
    }
};
