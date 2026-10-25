<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where each person lives: an ISO country code, a city, and an area
 * (district, neighbourhood or region) — anywhere in the world.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->char('country', 2)->nullable()->after('phone');
            $table->string('city', 120)->nullable()->after('country');
            $table->string('area', 120)->nullable()->after('city');
            $table->index('country');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['country']);
            $table->dropColumn(['country', 'city', 'area']);
        });
    }
};
