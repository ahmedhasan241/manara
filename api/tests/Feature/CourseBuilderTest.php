<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Course;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourseBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_builds_a_curriculum_and_publishes_the_course(): void
    {
        Storage::fake('local');
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'title' => 'Organic Chemistry Basics', 'teacher_id' => $teacher->id]);

        // Publishing needs a public course with lectures.
        $this->asMember($teacher, $tenant, 'PATCH', "/api/v1/courses/{$course->id}/marketplace", ['publish' => true])
            ->assertUnprocessable()->assertJsonValidationErrors(['is_public', 'lectures']);

        $this->asMember($teacher, $tenant, 'PATCH', "/api/v1/courses/{$course->id}/marketplace", [
            'is_public' => true, 'price_cents' => 1999, 'level' => 'beginner', 'subtitle' => 'From atoms to reactions',
            'outcomes' => ['Name functional groups'], 'requirements' => ['High-school chemistry'],
        ])->assertOk()->assertJsonPath('slug', 'organic-chemistry-basics')->assertJsonPath('marketplace_status', 'draft');

        $intro = $this->asMember($teacher, $tenant, 'POST', "/api/v1/courses/{$course->id}/sections", ['title' => 'Getting started'])->assertCreated()->json('id');
        $deep = $this->asMember($teacher, $tenant, 'POST', "/api/v1/courses/{$course->id}/sections", ['title' => 'Going deeper'])->assertCreated()->json('id');

        $this->asMember($teacher, $tenant, 'POST', "/api/v1/sections/{$intro}/lectures", ['title' => 'Welcome', 'type' => 'video', 'video_url' => 'https://videos.example.com/welcome.mp4', 'duration_minutes' => 4, 'is_preview' => true])
            ->assertCreated()->assertJsonPath('duration_seconds', 240);
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/sections/{$intro}/lectures", ['title' => 'Lab safety', 'type' => 'article', 'body' => 'Goggles on.'])->assertCreated();
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/sections/{$deep}/lectures", ['title' => 'Uploaded', 'type' => 'video', 'file' => UploadedFile::fake()->create('l.mp4', 200, 'video/mp4')])->assertCreated();
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/sections/{$deep}/lectures", ['title' => 'No media', 'type' => 'video'])->assertUnprocessable();

        // Reorder: "Going deeper" goes first.
        $this->asMember($teacher, $tenant, 'POST', "/api/v1/curriculum/sections/{$deep}/move", ['direction' => 'up'])->assertNoContent();

        $this->asMember($teacher, $tenant, 'GET', "/api/v1/courses/{$course->id}/curriculum")
            ->assertOk()
            ->assertJsonPath('curriculum.0.title', 'Going deeper')
            ->assertJsonPath('curriculum.1.lectures.0.title', 'Welcome')
            ->assertJsonPath('curriculum.1.lectures.0.is_preview', true);

        $this->asMember($teacher, $tenant, 'PATCH', "/api/v1/courses/{$course->id}/marketplace", ['publish' => true])
            ->assertOk()->assertJsonPath('marketplace_status', 'published');
        $this->assertNotNull($course->fresh()->marketplace_published_at);

        Storage::disk('local')->assertExists(Lecture::where('title', 'Uploaded')->first()->path);
    }

    public function test_students_cannot_edit_the_curriculum(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);

        $this->asMember($course->students()->first(), $tenant, 'POST', "/api/v1/courses/{$course->id}/sections", ['title' => 'Hack'])->assertForbidden();
        $this->asMember($course->students()->first(), $tenant, 'PATCH', "/api/v1/courses/{$course->id}/marketplace", ['publish' => true])->assertForbidden();
    }

    public function test_school_adds_students_in_bulk_and_enrolls_them(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->member($tenant, Role::Admin);
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'bulk-course']);
        $existing = $this->member($tenant, Role::Student);
        $existing->update(['email' => 'already@school.test']);

        $this->asMember($admin, $tenant, 'POST', '/api/v1/members/bulk', [
            'role' => 'student',
            'course_id' => $course->id,
            'people' => [
                ['name' => 'Nour Ali', 'email' => 'nour@school.test'],
                ['name' => 'Sam Lee', 'email' => 'SAM@school.test', 'student_number' => 'S-2'],
                ['name' => 'Already Here', 'email' => 'already@school.test'],
            ],
        ])->assertCreated()->assertJsonPath('added', 2)->assertJsonPath('existing', 1);

        $this->assertSame(3, $course->enrollments()->count());
        $sam = User::where('email', 'sam@school.test')->first();
        $this->assertDatabaseHas('course_access', ['user_id' => $sam->id, 'course_id' => $course->id, 'source' => 'enrollment']);
        $this->assertDatabaseHas('course_access', ['user_id' => $existing->id, 'course_id' => $course->id]);

        $teacher = $this->member($tenant, Role::Teacher);
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/members/bulk', ['role' => 'student', 'people' => [['name' => 'X', 'email' => 'x@x.test']]])->assertForbidden();
    }
}
