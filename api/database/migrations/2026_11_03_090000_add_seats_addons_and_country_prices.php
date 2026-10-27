<?php

use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pricing that fits each market and each organisation's size: prices per
 * country, extra student and staff seats on top of what a plan includes, and
 * video meetings sold as an add-on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('extra_student_cents')->default(0)->after('price_yearly_cents');
            $table->unsignedInteger('extra_staff_cents')->default(0)->after('extra_student_cents');
            // Null: video meetings are included rather than sold separately.
            $table->unsignedInteger('video_addon_cents')->nullable()->after('extra_staff_cents');
        });

        Schema::create('plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->char('country', 2);
            $table->char('currency', 3);
            $table->unsignedInteger('price_monthly_cents');
            $table->unsignedInteger('price_yearly_cents');
            $table->unsignedInteger('extra_student_cents')->default(0);
            $table->unsignedInteger('extra_staff_cents')->default(0);
            $table->unsignedInteger('video_addon_cents')->nullable();
            $table->timestamps();
            $table->unique(['plan_id', 'country']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('extra_students')->default(0)->after('interval');
            $table->unsignedInteger('extra_staff')->default(0)->after('extra_students');
            $table->boolean('video_addon')->default(false)->after('extra_staff');
            $table->char('country', 2)->nullable()->after('video_addon');
            $table->char('currency', 3)->nullable()->after('country');
            // The price agreed for each billing interval, fixed when the subscription changes.
            $table->unsignedInteger('amount_cents')->nullable()->after('currency');
        });

        // Workspaces that already had video meetings keep them.
        DB::table('subscriptions')->update(['video_addon' => true]);

        foreach (Plan::all() as $plan) {
            $plan->applyDefaultPricing();
        }
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['extra_students', 'extra_staff', 'video_addon', 'country', 'currency', 'amount_cents']);
        });
        Schema::dropIfExists('plan_prices');
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['extra_student_cents', 'extra_staff_cents', 'video_addon_cents']);
        });
    }
};
