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
        Schema::create('occurrence_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occurrence_id')->constrained('occurrences')->cascadeOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('validation_type'); // corroboration, official_confirmation, moderation
            $table->string('status'); // pending, approved, rejected
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('occurrence_id');
            $table->index('validated_by');
            $table->index('validation_type');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('occurrence_validations');
    }
};
