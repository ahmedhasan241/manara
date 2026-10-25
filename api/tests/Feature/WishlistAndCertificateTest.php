<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WishlistAndCertificateTest extends TestCase
{
    use RefreshDatabase;

    private function publishedCourse(int $price, string $slug, int $lectures = 2): Course
    {
        $tenant = Tenant::factory()->create();
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => $slug, 'price_cents' => $price, 'title' => 'Algebra basics']);
        $section = CourseSection::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Start', 'position' => 1]);
        foreach (range(1, $lectures) as $n) {
            Lecture::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'section_id' => $section->id, 'title' => "Lecture {$n}", 'type' => 'video', 'video_url' => "https://v.example.com/{$slug}-{$n}.mp4", 'duration_seconds' => 600, 'is_preview' => false, 'position' => $n]);
        }

        return $course;
    }

    public function test_learner_saves_and_removes_courses(): void
    {
        $course = $this->publishedCourse(1500, 'saved-course');
        $draft = Course::factory()->create(['tenant_id' => $course->tenant_id, 'slug' => 'draft']);
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/v1/wishlist/{$course->id}")->assertCreated();
        $this->putJson("/api/v1/wishlist/{$course->id}")->assertCreated();
        $this->putJson("/api/v1/wishlist/{$draft->id}")->assertNotFound();

        $this->getJson('/api/v1/wishlist')->assertOk()->assertJsonCount(1)->assertJsonPath('0.slug', 'saved-course');
        $this->getJson('/api/v1/wishlist/ids')->assertExactJson([$course->id]);
        $this->getJson('/api/v1/learning/courses/saved-course/status')->assertJsonPath('wishlisted', true);

        $this->deleteJson("/api/v1/wishlist/{$course->id}")->assertOk();
        $this->getJson('/api/v1/wishlist')->assertJsonCount(0);
    }

    public function test_bought_courses_leave_the_wishlist(): void
    {
        $course = $this->publishedCourse(0, 'free-one');
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/v1/wishlist/{$course->id}")->assertCreated();
        $this->postJson('/api/v1/orders', ['course_ids' => [$course->id]])->assertCreated();

        $this->getJson('/api/v1/wishlist')->assertJsonCount(0);
    }

    public function test_finishing_every_lecture_issues_a_verifiable_certificate(): void
    {
        $course = $this->publishedCourse(0, 'finish-me');
        $user = User::factory()->create(['name' => 'Layla Hassan']);
        Sanctum::actingAs($user);
        $this->postJson('/api/v1/orders', ['course_ids' => [$course->id]])->assertCreated();
        [$first, $second] = Lecture::where('course_id', $course->id)->orderBy('position')->get()->all();

        $this->postJson("/api/v1/learning/lectures/{$first->id}/progress", ['completed' => true])->assertJsonPath('certificate', null);
        $code = $this->postJson("/api/v1/learning/lectures/{$second->id}/progress", ['completed' => true])->json('certificate');

        $this->assertMatchesRegularExpression('/^MN-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/', $code);

        // Unticking a lecture keeps the certificate already earned.
        $this->postJson("/api/v1/learning/lectures/{$second->id}/progress", ['completed' => false])->assertJsonPath('certificate', $code);
        $this->getJson('/api/v1/learning/courses/finish-me')->assertJsonPath('certificate', $code);
        $this->getJson('/api/v1/my/certificates')->assertJsonCount(1)->assertJsonPath('0.code', $code);

        // Anyone can verify it, without signing in.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/certificates/'.strtolower($code))
            ->assertOk()
            ->assertJsonPath('recipient_name', 'Layla Hassan')
            ->assertJsonPath('course_title', 'Algebra basics')
            ->assertJsonPath('duration_seconds', 1200)
            ->assertJsonPath('course_slug', 'finish-me');
        $this->getJson('/api/v1/certificates/MN-AAAA-AAAA')->assertNotFound();
    }
}
