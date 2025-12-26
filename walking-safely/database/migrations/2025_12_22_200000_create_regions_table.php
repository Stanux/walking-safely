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
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->geometry('boundary', subtype: 'polygon', srid: 4326);
            $table->foreignId('parent_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->string('type')->default('neighborhood'); // city, district, neighborhood
            $table->timestamps();

            $table->spatialIndex('boundary');
            $table->index('parent_id');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('regions');
    }
};
