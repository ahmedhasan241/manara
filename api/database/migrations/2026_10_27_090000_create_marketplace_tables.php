<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The course marketplace: any educator (teacher, lecturer, school, university)
     * can publish a course with a curriculum of recorded lectures, and anyone
     * can buy it and learn at their own pace.
     */
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->after('is_archived');
            $table->string('marketplace_status', 20)->default('draft')->after('is_public'); // draft, published, suspended
            $table->string('slug', 120)->nullable()->unique()->after('marketplace_status');
            $table->string('subtitle', 255)->nullable()->after('slug');
            $table->string('level', 20)->default('all')->after('subtitle'); // beginner, intermediate, advanced, all
            $table->string('language', 10)->default('en')->after('level');
            $table->unsignedInteger('price_cents')->default(0)->after('language');
            $table->string('currency', 3)->default('USD')->after('price_cents');
            $table->json('outcomes')->nullable()->after('currency');
            $table->json('requirements')->nullable()->after('outcomes');
            $table->timestamp('marketplace_published_at')->nullable()->after('requirements');
            $table->index(['is_public', 'marketplace_status']);
        });

        Schema::create('course_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['course_id', 'position']);
        });

        Schema::create('lectures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('section_id')->constrained('course_sections')->cascadeOnDelete();
            $table->string('title');
            $table->string('type', 20)->default('video'); // video, article
            $table->text('body')->nullable();
            $table->string('video_url')->nullable();
            $table->string('disk')->nullable();
            $table->string('path')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['section_id', 'position']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('number', 20)->unique();
            $table->string('status', 20)->default('pending'); // pending, paid, canceled
            $table->unsignedInteger('subtotal_cents')->default(0);
            $table->unsignedInteger('total_cents')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('provider', 20)->nullable();
            $table->string('provider_reference')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('price_cents');
            $table->timestamps();
        });

        Schema::create('course_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('source', 20); // purchase, free, enrollment
            $table->foreignUuid('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('last_viewed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'course_id']);
        });

        Schema::create('lecture_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('lecture_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position_seconds')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'lecture_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecture_progress');
        Schema::dropIfExists('course_access');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('lectures');
        Schema::dropIfExists('course_sections');

        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex(['is_public', 'marketplace_status']);
            $table->dropUnique(['slug']);
            $table->dropColumn(['is_public', 'marketplace_status', 'slug', 'subtitle', 'level', 'language', 'price_cents', 'currency', 'outcomes', 'requirements', 'marketplace_published_at']);
        });
    }
};
