<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_browses_published_courses_from_every_workspace(): void
    {
        $school = Tenant::factory()->create(['name' => 'Greenwood', 'type' => 'school']);
        $uni = Tenant::factory()->create(['name' => 'North Uni', 'type' => 'university']);
        $teacher = $this->member($uni, Role::Teacher);
        $teacher->update(['name' => 'Dr. Amal']);

        Course::factory()->create(['tenant_id' => $school->id, 'title' => 'Algebra for all', 'category' => 'Mathematics', 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'algebra', 'price_cents' => 0]);
        $bio = Course::factory()->create(['tenant_id' => $uni->id, 'title' => 'Cell biology', 'category' => 'Science', 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'cells', 'price_cents' => 4900, 'teacher_id' => $teacher->id, 'outcomes' => ['Explain mitosis']]);
        Course::factory()->create(['tenant_id' => $uni->id, 'title' => 'Private class', 'is_public' => false, 'slug' => 'private']);
        Course::factory()->create(['tenant_id' => $uni->id, 'title' => 'Paused', 'is_public' => true, 'marketplace_status' => 'suspended', 'slug' => 'paused']);
        $section = CourseSection::create(['tenant_id' => $uni->id, 'course_id' => $bio->id, 'title' => 'Cells', 'position' => 1]);
        $preview = Lecture::create(['tenant_id' => $uni->id, 'course_id' => $bio->id, 'section_id' => $section->id, 'title' => 'What is a cell', 'type' => 'video', 'video_url' => 'https://v.example.com/a.mp4', 'duration_seconds' => 600, 'is_preview' => true]);
        $locked = Lecture::create(['tenant_id' => $uni->id, 'course_id' => $bio->id, 'section_id' => $section->id, 'title' => 'Mitosis', 'type' => 'video', 'video_url' => 'https://v.example.com/b.mp4', 'duration_seconds' => 900]);

        $this->getJson('/api/v1/catalog/courses')->assertOk()->assertJsonPath('total', 2);
        $this->getJson('/api/v1/catalog/courses?price=paid')->assertJsonPath('total', 1)->assertJsonPath('data.0.slug', 'cells');
        $this->getJson('/api/v1/catalog/courses?search=algebra')->assertJsonPath('data.0.title', 'Algebra for all');
        $this->getJson('/api/v1/catalog/courses?organization='.$uni->slug)->assertJsonPath('total', 1);
        $this->getJson('/api/v1/catalog/courses?category=Mathematics')->assertJsonPath('total', 1);

        $this->getJson('/api/v1/catalog/courses/cells')
            ->assertOk()
            ->assertJsonPath('instructor.name', 'Dr. Amal')
            ->assertJsonPath('organization.type', 'university')
            ->assertJsonPath('duration_seconds', 1500)
            ->assertJsonPath('outcomes.0', 'Explain mitosis')
            ->assertJsonPath('curriculum.0.lectures.0.is_preview', true)
            ->assertJsonMissingPath('curriculum.0.lectures.0.video_url');
        $this->getJson('/api/v1/catalog/courses/private')->assertNotFound();
        $this->getJson('/api/v1/catalog/courses/paused')->assertNotFound();

        $this->postJson("/api/v1/catalog/lectures/{$preview->id}/preview")->assertOk()->assertJsonPath('url', 'https://v.example.com/a.mp4');
        $this->postJson("/api/v1/catalog/lectures/{$locked->id}/preview")->assertNotFound();

        $this->getJson('/api/v1/catalog/categories')->assertJsonCount(2);
        $this->getJson('/api/v1/catalog/organizations?type=university')->assertJsonPath('0.name', 'North Uni')->assertJsonPath('0.courses', 1);
        $this->getJson("/api/v1/catalog/instructors/{$teacher->id}")->assertOk()->assertJsonCount(1, 'courses');
        $this->getJson('/api/v1/catalog/stats')->assertJsonPath('courses', 2)->assertJsonPath('lectures', 2);
    }

    public function test_instructors_have_a_directory_and_a_full_profile(): void
    {
        $uni = Tenant::factory()->create(['name' => 'Medica', 'type' => 'university']);
        $school = Tenant::factory()->create(['name' => 'Greenwood', 'type' => 'school']);
        $doctor = tap($this->member($uni, Role::Teacher))->update(['name' => 'Dr. Sara Mansour']);
        $teacher = tap($this->member($school, Role::Teacher))->update(['name' => 'Mr. Ali']);
        $learner = User::factory()->create(['name' => 'Amira Hassan']);

        $aid = Course::factory()->create(['tenant_id' => $uni->id, 'teacher_id' => $doctor->id, 'title' => 'First aid', 'category' => 'Medicine', 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'first-aid']);
        Course::factory()->create(['tenant_id' => $school->id, 'teacher_id' => $teacher->id, 'category' => 'Mathematics', 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'algebra']);
        Course::factory()->create(['tenant_id' => $uni->id, 'teacher_id' => $doctor->id, 'is_public' => false, 'slug' => 'unpublished']);
        $section = CourseSection::create(['tenant_id' => $uni->id, 'course_id' => $aid->id, 'title' => 'Basics', 'position' => 1]);
        Lecture::create(['tenant_id' => $uni->id, 'course_id' => $aid->id, 'section_id' => $section->id, 'title' => 'Recovery position', 'type' => 'video', 'duration_seconds' => 300, 'is_preview' => true]);
        Lecture::create(['tenant_id' => $uni->id, 'course_id' => $aid->id, 'section_id' => $section->id, 'title' => 'CPR', 'type' => 'video', 'duration_seconds' => 600]);
        $aid->reviews()->create(['tenant_id' => $uni->id, 'user_id' => $learner->id, 'rating' => 5, 'comment' => 'Clear and calm.']);

        // Teachers write their own headline and bio.
        Sanctum::actingAs($doctor);
        $this->patchJson('/api/v1/me', ['headline' => 'Emergency physician', 'bio' => 'I teach first aid.'])->assertOk();

        $this->getJson('/api/v1/catalog/instructors')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/v1/catalog/instructors?type=university')
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Dr. Sara Mansour')
            ->assertJsonPath('0.headline', 'Emergency physician')
            ->assertJsonPath('0.categories.0', 'Medicine');
        $this->getJson('/api/v1/catalog/instructors?category=Mathematics')->assertJsonCount(1)->assertJsonPath('0.name', 'Mr. Ali');
        $this->getJson('/api/v1/catalog/instructors?search=physician')->assertJsonCount(1);

        $this->getJson("/api/v1/catalog/instructors/{$doctor->id}")
            ->assertOk()
            ->assertJsonPath('bio', 'I teach first aid.')
            ->assertJsonCount(1, 'courses')
            ->assertJsonPath('lectures_count', 2)
            ->assertJsonPath('duration_seconds', 900)
            ->assertJsonPath('previews.0.title', 'Recovery position')
            ->assertJsonPath('previews.0.course.slug', 'first-aid')
            ->assertJsonPath('reviews.0.author', 'Amira')
            ->assertJsonPath('rating', 5);
    }

    public function test_platform_staff_see_sales_and_pause_courses(): void
    {
        $tenant = Tenant::factory()->create();
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => 'c1', 'price_cents' => 1000]);
        $staff = User::factory()->create(['is_platform_admin' => true]);
        $staff->forceFill(['mfa_secret' => Totp::generateSecret(), 'mfa_enabled_at' => now()])->save();

        Sanctum::actingAs($staff);
        $this->getJson('/api/v1/platform/marketplace')->assertOk()->assertJsonPath('published', 1);
        $this->patchJson("/api/v1/platform/marketplace/courses/{$course->id}", ['status' => 'suspended'])->assertOk();
        $this->getJson('/api/v1/catalog/courses/c1')->assertNotFound();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/platform/marketplace')->assertForbidden();
    }
}
