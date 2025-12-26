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
        Schema::create('crime_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('parent_id')->nullable()->constrained('crime_categories')->nullOnDelete();
            $table->decimal('weight', 5, 2)->default(1.00);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index('parent_id');
        });

        Schema::create('crime_category_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crime_category_id')->constrained('crime_categories')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('name');
            $table->foreignId('parent_id')->nullable();
            $table->decimal('weight', 5, 2);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['crime_category_id', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crime_category_versions');
        Schema::dropIfExists('crime_categories');
    }
};
