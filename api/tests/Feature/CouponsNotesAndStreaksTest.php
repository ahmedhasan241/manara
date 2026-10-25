<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\LearningDay;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CouponsNotesAndStreaksTest extends TestCase
{
    use RefreshDatabase;

    private function course(Tenant $tenant, string $slug, int $price): Course
    {
        $course = Course::factory()->create(['tenant_id' => $tenant->id, 'is_public' => true, 'marketplace_status' => 'published', 'slug' => $slug, 'price_cents' => $price]);
        $section = CourseSection::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Start', 'position' => 1]);
        foreach ([1, 2] as $n) {
            Lecture::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'section_id' => $section->id, 'title' => "L{$n}", 'type' => 'video', 'video_url' => "https://v.example.com/{$slug}{$n}.mp4", 'duration_seconds' => 600, 'is_preview' => false, 'position' => $n]);
        }

        return $course;
    }

    public function test_staff_create_codes_and_learners_get_the_discount(): void
    {
        $tenant = Tenant::factory()->create();
        $other = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $mine = $this->course($tenant, 'mine', 2000);
        $theirs = $this->course($other, 'theirs', 3000);

        $this->asMember($teacher, $tenant, 'POST', '/api/v1/coupons', ['code' => 'launch25', 'percent_off' => 25])
            ->assertCreated()->assertJsonPath('code', 'LAUNCH25');
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/coupons', ['code' => 'LAUNCH25', 'percent_off' => 10])->assertUnprocessable();
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/coupons', ['code' => 'ONCE', 'percent_off' => 50, 'max_uses' => 1, 'course_id' => $mine->id])->assertCreated();
        $this->asMember($teacher, $tenant, 'GET', '/api/v1/coupons')->assertJsonCount(2);

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/coupons/check', ['code' => ' launch25 ', 'course_ids' => [$mine->id, $theirs->id]])
            ->assertOk()->assertJsonPath('percent_off', 25)->assertJsonPath("prices.{$mine->id}", 1500)->assertJsonMissingPath("prices.{$theirs->id}");
        $this->postJson('/api/v1/coupons/check', ['code' => 'LAUNCH25', 'course_ids' => [$theirs->id]])->assertJsonValidationErrors('coupon');
        $this->postJson('/api/v1/coupons/check', ['code' => 'NOPE', 'course_ids' => [$mine->id]])->assertJsonValidationErrors('coupon');

        $order = $this->postJson('/api/v1/orders', ['course_ids' => [$mine->id, $theirs->id], 'coupon' => 'launch25'])
            ->assertCreated()
            ->assertJsonPath('order.subtotal_cents', 5000)
            ->assertJsonPath('order.discount_cents', 500)
            ->assertJsonPath('order.total_cents', 4500)
            ->assertJsonPath('order.coupon_code', 'LAUNCH25')
            ->json('order');

        // A one-use code stops working after a paid order.
        $once = $this->postJson('/api/v1/orders', ['course_ids' => [$mine->id], 'coupon' => 'ONCE'])->assertCreated()->json('order');
        $this->postJson("/api/v1/orders/{$once['id']}/pay")->assertOk();
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/coupons/check', ['code' => 'ONCE', 'course_ids' => [$mine->id]])->assertJsonValidationErrors('coupon');

        // Sales count what was actually paid.
        Sanctum::actingAs(User::find($order['user_id']));
        $this->postJson("/api/v1/orders/{$order['id']}/pay")->assertOk();
        $this->asMember($teacher, $tenant, 'GET', '/api/v1/sales')->assertJsonPath('revenue_cents', 1500 + 1000);
    }

    public function test_learners_keep_private_notes_on_lectures(): void
    {
        $course = $this->course(Tenant::factory()->create(), 'notes', 0);
        $lecture = Lecture::where('course_id', $course->id)->orderBy('position')->first();
        $learner = User::factory()->create();
        Sanctum::actingAs($learner);

        $this->postJson("/api/v1/learning/lectures/{$lecture->id}/notes", ['body' => 'Too early'])->assertForbidden();
        $this->postJson('/api/v1/catalog/courses/notes/enroll')->assertCreated();

        $note = $this->postJson("/api/v1/learning/lectures/{$lecture->id}/notes", ['body' => 'Key formula here', 'position_seconds' => 95])
            ->assertCreated()->assertJsonPath('lecture.title', 'L1')->json();
        $this->patchJson("/api/v1/learning/notes/{$note['id']}", ['body' => 'Key formula: E=mc²'])->assertOk();
        $this->getJson('/api/v1/learning/courses/notes/notes')->assertJsonCount(1)->assertJsonPath('0.body', 'Key formula: E=mc²');

        Sanctum::actingAs(User::factory()->create());
        $this->deleteJson("/api/v1/learning/notes/{$note['id']}")->assertNotFound();
    }

    public function test_watching_builds_a_streak_toward_the_weekly_goal(): void
    {
        Carbon::setTestNow('2026-10-28 18:00:00');
        $course = $this->course(Tenant::factory()->create(), 'streaky', 0);
        [$first, $second] = Lecture::where('course_id', $course->id)->orderBy('position')->get()->all();
        $learner = User::factory()->create();
        Sanctum::actingAs($learner);
        $this->postJson('/api/v1/catalog/courses/streaky/enroll')->assertCreated();

        // Two earlier days in a row, then today.
        LearningDay::create(['user_id' => $learner->id, 'day' => '2026-10-26', 'seconds' => 600]);
        LearningDay::create(['user_id' => $learner->id, 'day' => '2026-10-27', 'seconds' => 300]);
        $this->getJson('/api/v1/learning/stats')->assertJsonPath('streak', 2)->assertJsonPath('today_seconds', 0);

        $this->postJson("/api/v1/learning/lectures/{$first->id}/progress", ['position_seconds' => 15]);
        $this->postJson("/api/v1/learning/lectures/{$first->id}/progress", ['position_seconds' => 30]);
        $this->postJson("/api/v1/learning/lectures/{$first->id}/progress", ['position_seconds' => 500]); // a seek, not watching
        $this->postJson("/api/v1/learning/lectures/{$second->id}/progress", ['completed' => true]);
        $this->postJson("/api/v1/learning/lectures/{$second->id}/progress", ['completed' => true]); // counted once

        $this->getJson('/api/v1/learning/stats')
            ->assertJsonPath('streak', 3)
            ->assertJsonPath('today_seconds', 30 + 60)
            ->assertJsonPath('week_seconds', 600 + 300 + 90)
            ->assertJsonPath('weekly_goal_minutes', 60)
            ->assertJsonCount(7, 'week');

        $this->putJson('/api/v1/learning/goal', ['weekly_goal_minutes' => 150])->assertOk()->assertJsonPath('weekly_goal_minutes', 150);
        $this->putJson('/api/v1/learning/goal', ['weekly_goal_minutes' => 5])->assertUnprocessable();
    }
}
