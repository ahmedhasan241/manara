<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Online lessons and lectures: scheduled meetings on a video provider (Zoom,
     * Jitsi), who joined, and the recordings attached to the course afterwards.
     */
    public function up(): void
    {
        Schema::create('live_lessons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('host_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('status')->default('scheduled'); // scheduled | live | ended | canceled
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->boolean('auto_record')->default(true);
            $table->string('provider'); // zoom | jitsi
            $table->string('provider_meeting_id')->nullable()->index();
            $table->text('join_url')->nullable();
            $table->text('host_url')->nullable(); // encrypted: lets anyone holding it start the meeting as host
            $table->text('passcode')->nullable(); // encrypted
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status', 'scheduled_at']);
            $table->index(['course_id', 'scheduled_at']);
        });

        Schema::create('live_lesson_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('live_lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('first_joined_at');
            $table->timestamp('last_joined_at');
            $table->unsignedSmallInteger('join_count')->default(1);
            $table->timestamps();
            $table->unique(['live_lesson_id', 'user_id']);
        });

        Schema::create('lesson_recordings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('live_lesson_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('source'); // zoom | upload | link
            $table->string('provider_file_id')->nullable()->unique();
            $table->string('status')->default('processing'); // processing | ready | failed
            $table->string('disk')->nullable();
            $table->string('path')->nullable();
            $table->text('external_url')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['course_id', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_recordings');
        Schema::dropIfExists('live_lesson_attendees');
        Schema::dropIfExists('live_lessons');
    }
};
