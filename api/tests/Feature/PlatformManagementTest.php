<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_platform_admin' => true]);
        $this->admin->forceFill(['mfa_secret' => Totp::generateSecret(), 'mfa_enabled_at' => now()])->save();
    }

    public function test_suspending_a_user_signs_them_out_everywhere(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $token = $teacher->createToken('phone')->plainTextToken;

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/platform/users/{$teacher->id}", ['suspended' => true, 'reason' => 'Spam'])->assertOk()->assertJsonPath('suspension_reason', 'Spam');
        $this->assertSame(0, $teacher->tokens()->count());

        // Login refused while suspended.
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => $teacher->email, 'password' => 'password'])->assertUnprocessable();

        // Any session still open is refused too.
        Sanctum::actingAs($teacher->fresh());
        $this->getJson('/api/v1/me')->assertForbidden()->assertJsonPath('code', 'account_suspended');

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/v1/platform/users/{$teacher->id}", ['suspended' => false])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => $teacher->email, 'password' => 'password'])->assertOk();
        $this->assertNotEmpty($token);
    }

    public function test_user_directory_filters_by_role_across_workspaces(): void
    {
        $a = Tenant::factory()->create();
        $b = Tenant::factory()->create();
        $student = $this->member($a, Role::Student);
        $this->member($b, Role::Parent, ['guardian_of_id' => $student->id]);
        $this->member($b, Role::Teacher);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/v1/platform/users?role=parent')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.memberships.0.role', 'parent');
        $this->getJson("/api/v1/platform/users?tenant_id={$a->id}")->assertJsonPath('total', 1);
        $this->getJson("/api/v1/platform/users/{$student->id}")->assertOk()->assertJsonCount(1, 'guardians');
        $this->getJson("/api/v1/platform/tenants/{$b->id}/members?role=teacher")->assertOk()->assertJsonPath('total', 1);
        $this->postJson("/api/v1/platform/users/{$student->id}/reset-mfa")->assertNoContent();
    }

    public function test_subscriptions_can_be_filtered_extended_and_canceled(): void
    {
        $plan = Plan::factory()->create();
        $ending = Tenant::factory()->create();
        $ending->subscriptions()->create(['plan_id' => $plan->id, 'status' => 'trialing', 'trial_ends_at' => now()->addDays(3)]);
        $paying = Tenant::factory()->create();
        $paying->subscriptions()->create(['plan_id' => $plan->id, 'status' => 'active']);

        Sanctum::actingAs($this->admin);
        $id = $this->getJson('/api/v1/platform/subscriptions?status=trial_ending')->assertOk()->assertJsonPath('total', 1)->json('data.0.id');

        $this->patchJson("/api/v1/platform/subscriptions/{$id}", ['trial_ends_at' => now()->addDays(30)->toIso8601String()])->assertOk();
        $this->getJson('/api/v1/platform/subscriptions?status=trial_ending')->assertJsonPath('total', 0);

        $this->patchJson("/api/v1/platform/subscriptions/{$id}", ['status' => 'canceled'])->assertOk()->assertJsonPath('status', 'canceled');
        $this->getJson('/api/v1/platform/subscriptions?status=active')->assertJsonPath('total', 1);
    }

    public function test_website_content_is_editable_and_validated(): void
    {
        Sanctum::actingAs($this->admin);

        $this->putJson('/api/v1/platform/website/hero', ['content' => ['title' => 'Missing fields']])->assertUnprocessable();
        $this->putJson('/api/v1/platform/website/faq', ['content' => [['question' => 'Q?', 'answer' => 'A.']]])->assertOk();
        $this->putJson('/api/v1/platform/website/hero', ['content' => [
            'eyebrow' => 'New', 'title' => 'Teach brilliantly', 'subtitle' => 'Sub', 'primary_cta' => 'Try', 'secondary_cta' => 'Prices',
        ]])->assertOk();
        $this->putJson('/api/v1/platform/website/unknown', ['content' => []])->assertNotFound();

        $this->getJson('/api/v1/marketing')->assertOk()
            ->assertJsonPath('hero.title', 'Teach brilliantly')
            ->assertJsonCount(1, 'faq')
            ->assertJsonStructure(['audiences', 'features', 'testimonials', 'plans']);

        $this->deleteJson('/api/v1/platform/website/hero')->assertOk();
        $this->getJson('/api/v1/marketing')->assertJsonPath('hero.title', config('marketing.sections.hero.title'));

        // Regular users can't edit.
        Sanctum::actingAs(User::factory()->create());
        $this->putJson('/api/v1/platform/website/faq', ['content' => []])->assertForbidden();
    }

    public function test_website_text_is_kept_per_language(): void
    {
        Sanctum::actingAs($this->admin);

        // Untouched languages use their translated defaults.
        $this->getJson('/api/v1/marketing', ['X-Locale' => 'ar'])->assertJsonPath('hero.title', 'أعمال إدارية أقل. تدريس أكثر.');

        $this->putJson('/api/v1/platform/website/cta', ['content' => ['title' => 'Prêts ?', 'subtitle' => 'Allons-y.', 'button' => 'Commencer']], ['X-Locale' => 'fr'])->assertOk();

        $this->getJson('/api/v1/marketing', ['X-Locale' => 'fr'])->assertJsonPath('cta.title', 'Prêts ?');
        $this->getJson('/api/v1/marketing', ['X-Locale' => 'en'])->assertJsonPath('cta.title', config('marketing.sections.cta.title'));
        $this->getJson('/api/v1/platform/website', ['X-Locale' => 'fr'])->assertJsonPath('locale', 'fr');
    }

    public function test_plans_show_in_the_visitors_language(): void
    {
        Sanctum::actingAs($this->admin);
        $plan = Plan::factory()->create(['name' => 'Starter', 'features' => ['Gradebook'], 'is_active' => true]);

        $this->putJson("/api/v1/platform/plans/{$plan->id}", ['translations' => ['ar' => ['name' => 'المبتدئ', 'features' => ['سجل الدرجات']]]])->assertOk();
        $this->putJson("/api/v1/platform/plans/{$plan->id}", ['translations' => ['xx' => ['name' => 'Nope']]])->assertUnprocessable();

        $this->getJson('/api/v1/plans', ['X-Locale' => 'ar'])->assertJsonPath('0.name', 'المبتدئ')->assertJsonPath('0.features.0', 'سجل الدرجات')->assertJsonMissingPath('0.translations');
        // No French translation: English it is.
        $this->getJson('/api/v1/plans', ['X-Locale' => 'fr'])->assertJsonPath('0.name', 'Starter');
    }
}
