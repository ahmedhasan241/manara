<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_sign_up_creates_workspace_owner_and_trial(): void
    {
        $this->seedPlan();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Amina Teacher',
            'email' => 'amina@example.com',
            'password' => 'Secret-Pass-123',
            'workspace_name' => 'Amina Classes',
            'workspace_slug' => 'amina',
            'workspace_type' => 'teacher',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.memberships.0.role', 'owner')
            ->assertJsonPath('user.memberships.0.tenant.slug', 'amina');
        $this->assertNotEmpty($response->json('token'));
        $this->assertSame('trialing', Tenant::where('slug', 'amina')->first()->subscription->status);
    }

    public function test_login_without_mfa_returns_token(): void
    {
        User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_mfa_enrolment_and_two_step_login(): void
    {
        $user = User::factory()->create(['email' => 'mfa@example.com']);
        Sanctum::actingAs($user);

        $secret = $this->postJson('/api/v1/me/mfa/setup')->assertOk()->json('secret');
        $recoveryCodes = $this->postJson('/api/v1/me/mfa/confirm', ['code' => Totp::code($secret)])
            ->assertOk()
            ->json('recovery_codes');
        $this->assertCount(8, $recoveryCodes);
        $this->assertTrue($user->fresh()->hasMfaEnabled());

        $challenge = $this->postJson('/api/v1/auth/login', ['email' => 'mfa@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('mfa_required', true)
            ->assertJsonMissingPath('token')
            ->json('challenge');

        $this->postJson('/api/v1/auth/mfa', ['challenge' => $challenge, 'code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/mfa', ['challenge' => $challenge, 'code' => Totp::code($secret)])
            ->assertOk()
            ->assertJsonStructure(['token']);

        // A recovery code works exactly once.
        $this->postJson('/api/v1/auth/mfa', ['challenge' => $challenge, 'code' => $recoveryCodes[0]])->assertOk();
        $this->postJson('/api/v1/auth/mfa', ['challenge' => $challenge, 'code' => $recoveryCodes[0]])->assertUnprocessable();
    }

    public function test_static_development_code_only_works_locally(): void
    {
        $secret = Totp::generateSecret();
        config(['auth.dev_static_otp' => '111111']);

        $this->app['env'] = 'production';
        $this->assertFalse(Totp::verify($secret, '111111'));

        $this->app['env'] = 'local';
        $this->assertTrue(Totp::verify($secret, '111111'));
        $this->assertFalse(Totp::verify($secret, '222222'));

        config(['auth.dev_static_otp' => null]);
        $this->assertFalse(Totp::verify($secret, '111111'));

        $this->app['env'] = 'testing';
    }

    public function test_invited_people_set_their_password_from_the_emailed_link(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'invited@school.test']);
        $user->createToken('old-device');

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'invited@school.test'])->assertOk();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@school.test'])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token, $user) {
            $token = $n->token;

            return str_starts_with($n->toMail($user)->actionUrl, config('app.learner_url').'/reset-password?token=');
        });

        $this->postJson('/api/v1/auth/reset-password', ['token' => 'wrong', 'email' => 'invited@school.test', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'email' => 'invited@school.test', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => 'invited@school.test', 'password' => 'newpass123'])->assertOk();
    }

    public function test_totp_matches_rfc_6238_reference_vector(): void
    {
        // RFC 6238 appendix B: secret "12345678901234567890", T=59 -> 94287082 (8 digits); 6-digit form is 287082.
        $this->assertSame('287082', Totp::code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59));
    }
}
