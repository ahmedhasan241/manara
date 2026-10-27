<?php

use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The share of each course sale Manara keeps, set per plan and per country
 * (lower for bigger packages), and fixed on each sale when it is ordered.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedTinyInteger('commission_percent')->nullable()->after('video_addon_cents');
        });
        Schema::table('plan_prices', function (Blueprint $table) {
            // Empty: the plan's own commission.
            $table->unsignedTinyInteger('commission_percent')->nullable()->after('video_addon_cents');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedTinyInteger('commission_percent')->nullable()->after('price_cents');
        });

        foreach (Plan::all() as $plan) {
            $plan->applyDefaultPricing();
        }
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn('commission_percent'));
        Schema::table('plan_prices', fn (Blueprint $table) => $table->dropColumn('commission_percent'));
        Schema::table('plans', fn (Blueprint $table) => $table->dropColumn('commission_percent'));
    }
};
