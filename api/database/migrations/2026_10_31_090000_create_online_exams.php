<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Online exams: any assessment can be taken online. Teachers add questions
     * of several kinds; students sit timed attempts that are marked
     * automatically (essays wait for the teacher) and feed the gradebook.
     */
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->after('type');
            $table->unsignedSmallInteger('time_limit_minutes')->nullable()->after('is_online');
            $table->unsignedTinyInteger('max_attempts')->default(1)->after('time_limit_minutes');
            $table->boolean('shuffle_questions')->default(false)->after('max_attempts');
            // immediately | after_due | never
            $table->string('results_visibility', 20)->default('immediately')->after('shuffle_questions');
            $table->text('instructions')->nullable()->after('results_visibility');
        });

        Schema::create('exam_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);
            // single_choice | multiple_choice | true_false | short_answer | numeric | fill_blanks | ordering | matching | essay
            $table->string('type', 30);
            $table->text('prompt');
            $table->decimal('points', 6, 2)->default(1);
            $table->json('options')->nullable();
            $table->json('answer')->nullable();
            $table->text('explanation')->nullable();
            $table->timestamps();
            $table->index(['assessment_id', 'position']);
        });

        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            // in_progress | needs_review | graded
            $table->string('status', 20)->default('in_progress');
            $table->json('question_order')->nullable();
            $table->json('answers')->nullable();
            $table->json('results')->nullable();
            $table->decimal('score', 8, 2)->nullable();
            $table->decimal('max_score', 8, 2)->default(0);
            $table->text('feedback')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('deadline_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->index(['assessment_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_attempts');
        Schema::dropIfExists('exam_questions');
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['is_online', 'time_limit_minutes', 'max_attempts', 'shuffle_questions', 'results_visibility', 'instructions']);
        });
    }
};
