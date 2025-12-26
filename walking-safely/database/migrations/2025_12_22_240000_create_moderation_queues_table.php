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
        Schema::create('moderation_queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('occurrence_id')->constrained('occurrences')->cascadeOnDelete();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason'); // e.g., 'anomaly_detected', 'user_reported', 'abuse_pattern'
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderator_notes')->nullable();
            $table->json('detection_details')->nullable(); // Details about why it was flagged
            $table->integer('priority')->default(0); // Higher = more urgent
            $table->timestamps();

            $table->index('status');
            $table->index('reason');
            $table->index('priority');
            $table->index(['status', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_queues');
    }
};
