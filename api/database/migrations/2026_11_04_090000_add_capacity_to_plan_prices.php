<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a plan includes can differ by country, like its price: students,
 * staff accounts and storage. Empty means the plan's own allowance.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->unsignedInteger('max_students')->nullable()->after('video_addon_cents');
            $table->unsignedInteger('max_staff')->nullable()->after('max_students');
            $table->unsignedInteger('storage_gb')->nullable()->after('max_staff');
        });
    }

    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->dropColumn(['max_students', 'max_staff', 'storage_gb']);
        });
    }
};
