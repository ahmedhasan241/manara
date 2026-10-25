<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Plans, tenants, subscriptions, memberships and the security columns on users.
     */
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('price_monthly_cents')->default(0);
            $table->unsignedInteger('price_yearly_cents')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('max_students')->nullable();
            $table->unsignedInteger('max_staff')->nullable();
            $table->unsignedInteger('storage_gb')->default(5);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('type'); // teacher | school | university
            $table->string('status')->default('active'); // active | suspended
            $table->string('country', 2)->nullable();
            $table->string('locale', 10)->default('en');
            $table->string('timezone')->default('UTC');
            $table->string('custom_domain')->nullable()->unique();
            $table->json('branding')->nullable(); // logo, colors
            $table->json('site')->nullable(); // public website content
            $table->json('settings')->nullable(); // require_mfa, grading scale, ...
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained();
            $table->string('status'); // trialing | active | past_due | canceled
            $table->string('interval')->default('monthly');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->string('provider')->nullable(); // stripe
            $table->string('provider_id')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_platform_admin')->default(false)->after('password');
            $table->string('locale', 10)->default('en')->after('is_platform_admin');
            $table->text('phone')->nullable()->after('locale'); // encrypted
            $table->text('mfa_secret')->nullable(); // encrypted
            $table->text('mfa_recovery_codes')->nullable(); // encrypted json
            $table->timestamp('mfa_enabled_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
        });

        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role'); // owner | admin | teacher | student | parent
            $table->string('student_number')->nullable();
            $table->foreignId('guardian_of_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_platform_admin', 'locale', 'phone', 'mfa_secret', 'mfa_recovery_codes', 'mfa_enabled_at', 'last_login_at']);
        });
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('plans');
    }
};
