<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - Courses get a category (Design, Science, Languages...) for browsing by topic.
     * - Students rate and review the courses they are enrolled in.
     */
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('category', 60)->nullable()->after('term');
        });

        Schema::create('course_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['course_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_reviews');

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
