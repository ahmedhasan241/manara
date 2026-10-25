<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutAndLearningTest extends TestCase
{
    use RefreshDatabase;

    private function publishedCourse(Tenant $tenant, int $price, string $slug): Course
    {
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => $slug, 'price_cents' => $price]);
        $section = CourseSection::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Start', 'position' => 1]);
        foreach (['Intro' => true, 'Deep dive' => false] as $title => $preview) {
            Lecture::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'section_id' => $section->id, 'title' => $title, 'type' => 'video', 'video_url' => "https://v.example.com/{$slug}-{$title}.mp4", 'duration_seconds' => 300, 'is_preview' => $preview, 'position' => $preview ? 1 : 2]);
        }

        return $course;
    }

    public function test_learner_signs_up_buys_courses_and_learns(): void
    {
        $tenant = Tenant::factory()->create();
        $paid = $this->publishedCourse($tenant, 2500, 'paid-course');
        $free = $this->publishedCourse($tenant, 0, 'free-course');
        $draft = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'slug' => 'draft-course', 'price_cents' => 100]);

        $token = $this->postJson('/api/v1/auth/register-learner', ['name' => 'Layla', 'email' => 'layla@example.com', 'password' => 'learning123'])
            ->assertCreated()->assertJsonCount(0, 'user.memberships')->json('token');
        $headers = ['Authorization' => "Bearer {$token}"];

        // Not owned yet: the paid lecture is locked, the preview is open.
        $locked = Lecture::where('course_id', $paid->id)->where('is_preview', false)->first();
        $this->postJson("/api/v1/learning/lectures/{$locked->id}/play", [], $headers)->assertForbidden();
        $this->getJson('/api/v1/learning/courses/paid-course', $headers)->assertForbidden();

        $order = $this->postJson('/api/v1/orders', ['course_ids' => [$paid->id, $free->id, $draft->id]], $headers)
            ->assertCreated()
            ->assertJsonPath('order.total_cents', 2500)
            ->assertJsonCount(1, 'order.items')
            ->assertJsonPath('granted.0', $free->id)
            ->json('order');

        $this->postJson("/api/v1/orders/{$order['id']}/pay", [], $headers)->assertOk()->assertJsonPath('status', 'paid');
        $this->postJson("/api/v1/orders/{$order['id']}/pay", [], $headers)->assertStatus(409);

        $this->getJson('/api/v1/learning', $headers)->assertOk()->assertJsonCount(2);
        $this->postJson("/api/v1/learning/lectures/{$locked->id}/play", [], $headers)->assertOk()->assertJsonPath('external', true);

        $this->postJson("/api/v1/learning/lectures/{$locked->id}/progress", ['completed' => true, 'position_seconds' => 290], $headers)
            ->assertOk()->assertJsonPath('progress.done', 1)->assertJsonPath('progress.total', 2);

        $this->getJson('/api/v1/learning/courses/paid-course', $headers)
            ->assertOk()
            ->assertJsonPath('progress.done', 1)
            ->assertJsonPath('curriculum.0.lectures.1.completed', true)
            ->assertJsonPath('owned', true);

        $this->putJson('/api/v1/learning/courses/paid-course/review', ['rating' => 5, 'comment' => 'Superb'], $headers)->assertCreated();
        $this->getJson('/api/v1/catalog/courses/paid-course')->assertJsonPath('reviews.count', 1)->assertJsonPath('students_count', 1);

        // Buying again adds nothing.
        $this->postJson('/api/v1/orders', ['course_ids' => [$paid->id]], $headers)->assertCreated()->assertJsonPath('order', null);
    }

    public function test_orders_are_private_and_free_enrollment_only_for_free_courses(): void
    {
        $tenant = Tenant::factory()->create();
        $paid = $this->publishedCourse($tenant, 900, 'p');
        $this->publishedCourse($tenant, 0, 'f');
        $buyer = User::factory()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($buyer);
        $orderId = $this->postJson('/api/v1/orders', ['course_ids' => [$paid->id]])->json('order.id');
        $this->postJson('/api/v1/catalog/courses/p/enroll')->assertUnprocessable();
        $this->postJson('/api/v1/catalog/courses/f/enroll')->assertCreated();

        Sanctum::actingAs($other);
        $this->postJson("/api/v1/orders/{$orderId}/pay")->assertNotFound();
        $this->getJson("/api/v1/orders/{$orderId}")->assertNotFound();
    }

    public function test_test_payments_are_refused_in_production(): void
    {
        $tenant = Tenant::factory()->create();
        $paid = $this->publishedCourse($tenant, 900, 'prod');
        Sanctum::actingAs(User::factory()->create());
        $orderId = $this->postJson('/api/v1/orders', ['course_ids' => [$paid->id]])->json('order.id');

        $this->app['env'] = 'production';
        $this->postJson("/api/v1/orders/{$orderId}/pay")->assertStatus(503);
        $this->app['env'] = 'testing';
    }

    public function test_staff_and_enrolled_students_watch_their_own_school_course(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->publishedCourse($tenant, 5000, 'school-course');
        $course->update(['marketplace_status' => 'draft']);
        $teacher = $this->member($tenant, Role::Teacher);
        $student = $this->member($tenant, Role::Student);
        $course->enrollments()->create(['tenant_id' => $tenant->id, 'student_id' => $student->id]);

        Sanctum::actingAs($teacher);
        $this->getJson('/api/v1/learning/courses/school-course')->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/v1/learning/courses/school-course')->assertOk();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/learning/courses/school-course')->assertForbidden();
    }
}
