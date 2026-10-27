<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Events\LiveLessonUpdated;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PricingAndEntitlementsTest extends TestCase
{
    use RefreshDatabase;

    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Event::fake([LiveLessonUpdated::class]);

        $this->plan = Plan::factory()->create([
            'code' => 'school', 'max_students' => 2, 'max_staff' => 2,
            'currency' => 'USD', 'price_monthly_cents' => 39900, 'price_yearly_cents' => 399000,
            'extra_student_cents' => 50, 'extra_staff_cents' => 500, 'video_addon_cents' => 12900,
        ]);
        $this->plan->prices()->create([
            'country' => 'SA', 'currency' => 'SAR', 'price_monthly_cents' => 149900, 'price_yearly_cents' => 1499000,
            'extra_student_cents' => 200, 'extra_staff_cents' => 2000, 'video_addon_cents' => 49900,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function subscribed(array $attributes = []): Tenant
    {
        $tenant = Tenant::factory()->create(['country' => 'SA']);
        Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $this->plan->id, 'status' => 'active', 'interval' => 'monthly', ...$attributes]);

        return $tenant;
    }

    public function test_plans_are_priced_for_the_visitors_country(): void
    {
        $this->getJson('/api/v1/plans', ['X-Country' => 'SA'])->assertOk()
            ->assertJsonPath('0.currency', 'SAR')
            ->assertJsonPath('0.price_monthly_cents', 149900)
            ->assertJsonPath('0.video_addon_cents', 49900)
            ->assertJsonPath('0.price_country', 'SA')
            ->assertJsonMissingPath('0.prices');

        $this->getJson('/api/v1/plans?country=us')->assertOk()
            ->assertJsonPath('0.currency', 'USD')
            ->assertJsonPath('0.price_monthly_cents', 39900)
            ->assertJsonPath('0.price_country', null);
    }

    public function test_sign_up_fixes_the_local_price_with_the_video_add_on(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Sara', 'email' => 'sara@example.com', 'password' => 'Secret-Pass-123',
            'workspace_name' => 'Riyadh School', 'workspace_slug' => 'riyadh', 'workspace_type' => 'school',
            'plan' => 'school', 'video_addon' => true, 'country' => 'SA', 'city' => 'Riyadh',
        ])->assertCreated();

        $subscription = Tenant::where('slug', 'riyadh')->first()->subscription;
        $this->assertSame('SAR', $subscription->currency);
        $this->assertSame(149900 + 49900, $subscription->amount_cents);
        $this->assertTrue($subscription->video_addon);
    }

    public function test_adding_people_beyond_the_paid_seats_is_refused_until_seats_are_added(): void
    {
        $tenant = $this->subscribed();
        $owner = $this->member($tenant, Role::Owner);
        $this->member($tenant, Role::Student);
        $this->member($tenant, Role::Student);

        $this->asMember($owner, $tenant, 'POST', '/api/v1/members', ['name' => 'Third', 'email' => 'third@example.com', 'role' => 'student'])
            ->assertUnprocessable()->assertJsonPath('code', 'seat_limit')->assertJsonPath('limit', 2);
        $this->asMember($owner, $tenant, 'POST', '/api/v1/members/bulk', ['role' => 'student', 'people' => [['name' => 'A', 'email' => 'a@example.com']]])
            ->assertUnprocessable()->assertJsonPath('code', 'seat_limit');
        // Parents never use a seat.
        $this->asMember($owner, $tenant, 'POST', '/api/v1/members', ['name' => 'Parent', 'email' => 'parent@example.com', 'role' => 'parent', 'children' => [$tenant->memberships()->where('role', 'student')->value('user_id')]])
            ->assertCreated();

        $this->asMember($owner, $tenant, 'PATCH', '/api/v1/billing', ['extra_students' => 10])->assertOk()
            ->assertJsonPath('seats.students.limit', 12)
            ->assertJsonPath('subscription.amount_cents', 149900 + 10 * 200);
        $this->asMember($owner, $tenant, 'POST', '/api/v1/members', ['name' => 'Third', 'email' => 'third@example.com', 'role' => 'student'])
            ->assertCreated();
    }

    public function test_packages_cannot_shrink_below_the_people_already_in_them(): void
    {
        $tenant = $this->subscribed(['extra_students' => 5]);
        $owner = $this->member($tenant, Role::Owner);
        foreach (range(1, 4) as $ignored) {
            $this->member($tenant, Role::Student);
        }

        $this->asMember($owner, $tenant, 'PATCH', '/api/v1/billing', ['extra_students' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('extra_students');
    }

    public function test_video_meetings_need_the_add_on_after_the_trial(): void
    {
        $tenant = $this->subscribed();
        $owner = $this->member($tenant, Role::Owner);
        $course = $this->courseWithStudents($tenant, 1);
        $lesson = ['title' => 'Algebra', 'scheduled_at' => now()->addHour()->toIso8601String(), 'duration_minutes' => 45];

        $this->asMember($owner, $tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", $lesson)
            ->assertForbidden()->assertJsonPath('code', 'addon_required');

        $this->asMember($owner, $tenant, 'PATCH', '/api/v1/billing', ['video_addon' => true])->assertOk()
            ->assertJsonPath('video_meetings', true)
            ->assertJsonPath('subscription.amount_cents', 149900 + 49900);
        $this->asMember($owner, $tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", $lesson)->assertCreated();
    }

    public function test_the_free_trial_includes_video_meetings(): void
    {
        $tenant = $this->subscribed(['status' => 'trialing', 'trial_ends_at' => now()->addDays(5)]);
        $owner = $this->member($tenant, Role::Owner);
        $course = $this->courseWithStudents($tenant, 1);

        $this->asMember($owner, $tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", [
            'title' => 'Algebra', 'scheduled_at' => now()->addHour()->toIso8601String(), 'duration_minutes' => 45,
        ])->assertCreated();
    }

    public function test_teachers_cannot_change_the_package(): void
    {
        $tenant = $this->subscribed();
        $teacher = $this->member($tenant, Role::Teacher);

        $this->asMember($teacher, $tenant, 'PATCH', '/api/v1/billing', ['video_addon' => true])->assertForbidden();
    }
}
