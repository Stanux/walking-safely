<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to add location permission fields to users table.
 *
 * @see Requirement 15.1 - Location permission management
 * @see Requirement 15.3 - Clear location data on permission revocation
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('location_permission_granted')->default(false)->after('two_factor_enabled');
            $table->timestamp('location_permission_granted_at')->nullable()->after('location_permission_granted');
            $table->timestamp('location_permission_revoked_at')->nullable()->after('location_permission_granted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'location_permission_granted',
                'location_permission_granted_at',
                'location_permission_revoked_at',
            ]);
        });
    }
};
