<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - Coupons: a workspace's discount codes for its online courses.
     * - Orders remember the code used and what each course cost before it.
     * - Private, time-stamped notes on lectures.
     * - Minutes learned per day, for streaks and the weekly goal.
     */
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->nullable()->constrained()->cascadeOnDelete(); // null = every course
            $table->string('code', 32)->unique();
            $table->unsignedTinyInteger('percent_off');
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('coupon_code', 32)->nullable()->after('currency');
            $table->unsignedInteger('discount_cents')->default(0)->after('subtotal_cents');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('list_price_cents')->nullable()->after('price_cents');
        });

        Schema::create('lecture_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('lecture_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position_seconds')->nullable();
            $table->text('body');
            $table->timestamps();
            $table->index(['user_id', 'course_id']);
        });

        Schema::create('learning_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('day');
            $table->unsignedInteger('seconds')->default(0);
            $table->unsignedSmallInteger('lectures_completed')->default(0);
            $table->unique(['user_id', 'day']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('weekly_goal_minutes')->default(60)->after('locale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('weekly_goal_minutes');
        });
        Schema::dropIfExists('learning_days');
        Schema::dropIfExists('lecture_notes');
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('list_price_cents');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['coupon_code', 'discount_cents']);
        });
        Schema::dropIfExists('coupons');
    }
};
