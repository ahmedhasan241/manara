<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_users_cannot_reach_platform_routes(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/platform/stats')->assertForbidden();
    }

    public function test_platform_admin_must_have_mfa(): void
    {
        Sanctum::actingAs(User::factory()->create(['is_platform_admin' => true]));

        $this->getJson('/api/v1/platform/stats')->assertForbidden()->assertJsonPath('code', 'mfa_setup_required');
    }

    public function test_platform_admin_can_list_and_suspend_tenants(): void
    {
        $admin = User::factory()->create(['is_platform_admin' => true]);
        $admin->forceFill(['mfa_secret' => Totp::generateSecret(), 'mfa_enabled_at' => now()])->save();
        Sanctum::actingAs($admin);
        $tenant = Tenant::factory()->create();

        $this->getJson('/api/v1/platform/stats')->assertOk()->assertJsonPath('tenants.total', 1);
        $this->getJson('/api/v1/platform/tenants')->assertOk()->assertJsonPath('data.0.slug', $tenant->slug);
        $this->patchJson("/api/v1/platform/tenants/{$tenant->id}", ['status' => 'suspended'])->assertOk();

        $this->assertSame('suspended', $tenant->fresh()->status);
    }

    public function test_public_site_endpoint(): void
    {
        $tenant = Tenant::factory()->create(['site' => ['tagline' => 'Learn well']]);

        $this->getJson("/api/v1/sites/{$tenant->slug}")->assertOk()->assertJsonPath('site.tagline', 'Learn well');
        $this->getJson('/api/v1/sites/missing')->assertNotFound();
    }
}
