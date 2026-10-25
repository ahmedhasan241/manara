<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * School and university structure: stages (primary, secondary, undergraduate…),
 * the grade levels / study years inside them, and class groups (sections) of
 * students. Courses become subjects taught to a level or class, and online
 * lessons get a lesson plan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('stage'); // kindergarten | primary | preparatory | secondary | diploma | undergraduate | postgraduate
            $table->string('name'); // "Grade 10", "Year 2"
            $table->string('department')->nullable(); // university faculty / department
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['tenant_id', 'position']);
        });

        Schema::create('class_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('academic_level_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // "10-A", "Group 2"
            $table->foreignId('advisor_id')->nullable()->constrained('users')->nullOnDelete(); // homeroom teacher / academic advisor
            $table->string('room')->nullable();
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->timestamps();
            $table->unique(['academic_level_id', 'name']);
        });

        // A student belongs to one class group per school.
        Schema::create('class_group_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('class_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'student_id']);
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->string('subject')->nullable()->after('title');
            $table->foreignUuid('academic_level_id')->nullable()->after('subject')->constrained()->nullOnDelete();
            $table->foreignUuid('class_group_id')->nullable()->after('academic_level_id')->constrained()->nullOnDelete();
            $table->decimal('credit_hours', 4, 1)->nullable()->after('class_group_id');
            $table->unsignedTinyInteger('periods_per_week')->nullable()->after('credit_hours');
            $table->unsignedTinyInteger('pass_percent')->default(50)->after('periods_per_week');
        });

        Schema::table('live_lessons', function (Blueprint $table) {
            $table->string('unit')->nullable()->after('description');
            $table->json('objectives')->nullable()->after('unit');
            $table->text('homework')->nullable()->after('objectives');
            $table->timestamp('homework_due_at')->nullable()->after('homework');
            $table->json('resources')->nullable()->after('homework_due_at');
            $table->text('summary')->nullable()->after('resources'); // what was covered, written after the lesson
        });
    }

    public function down(): void
    {
        Schema::table('live_lessons', function (Blueprint $table) {
            $table->dropColumn(['unit', 'objectives', 'homework', 'homework_due_at', 'resources', 'summary']);
        });
        Schema::table('courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('class_group_id');
            $table->dropConstrainedForeignId('academic_level_id');
            $table->dropColumn(['subject', 'credit_hours', 'periods_per_week', 'pass_percent']);
        });
        Schema::dropIfExists('class_group_student');
        Schema::dropIfExists('class_groups');
        Schema::dropIfExists('academic_levels');
    }
};
