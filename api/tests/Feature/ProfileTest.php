<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_people_sign_up_with_where_they_live(): void
    {
        $this->postJson('/api/v1/auth/register-learner', [
            'name' => 'Mona', 'email' => 'mona@example.com', 'password' => 'secret123',
            'country' => 'eg', 'city' => 'Cairo', 'area' => 'Heliopolis',
        ])->assertCreated()
            ->assertJsonPath('user.country', 'EG')
            ->assertJsonPath('user.city', 'Cairo')
            ->assertJsonPath('user.area', 'Heliopolis');

        $this->postJson('/api/v1/auth/register-learner', [
            'name' => 'X', 'email' => 'x@example.com', 'password' => 'secret123', 'country' => 'ZZ',
        ])->assertUnprocessable()->assertJsonValidationErrors('country');

        $this->seedPlan();
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Amina', 'email' => 'amina@example.com', 'password' => 'Secret-Pass-123',
            'workspace_name' => 'Amina Classes', 'workspace_slug' => 'amina', 'workspace_type' => 'school',
            'country' => 'SA', 'city' => 'Riyadh',
        ])->assertCreated()->assertJsonPath('user.country', 'SA');
        $this->assertSame('SA', User::where('email', 'amina@example.com')->first()->memberships()->first()->tenant->country);
    }

    public function test_people_edit_their_profile_and_location(): void
    {
        $token = User::factory()->create(['email' => 'a@example.com'])->createToken('web')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->patchJson('/api/v1/me', ['name' => 'Ali Hassan', 'phone' => '+20 100 000 0000', 'country' => 'ae', 'city' => 'Dubai', 'area' => 'Al Barsha', 'headline' => 'Maths teacher'], $headers)
            ->assertOk()
            ->assertJsonPath('message', 'Profile updated.')
            ->assertJsonPath('user.name', 'Ali Hassan')
            ->assertJsonPath('user.country', 'AE')
            ->assertJsonPath('user.area', 'Al Barsha');

        $this->getJson('/api/v1/me', $headers)->assertJsonPath('data.city', 'Dubai')->assertJsonPath('data.headline', 'Maths teacher');
        $this->patchJson('/api/v1/me', ['country' => 'Egypt'], $headers)->assertUnprocessable()->assertJsonValidationErrors('country');
        $this->patchJson('/api/v1/me', ['country' => null, 'city' => null], $headers)->assertOk()->assertJsonPath('user.country', null);
    }

    public function test_changing_the_password_signs_out_other_devices(): void
    {
        $user = User::factory()->create();
        $here = $user->createToken('laptop')->plainTextToken;
        $user->createToken('phone');
        $headers = ['Authorization' => "Bearer {$here}"];

        $this->putJson('/api/v1/me/password', ['current_password' => 'wrong', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->putJson('/api/v1/me/password', ['current_password' => 'password', 'password' => 'newpass123', 'password_confirmation' => 'nope'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->putJson('/api/v1/me/password', ['current_password' => 'password', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'], $headers)
            ->assertOk()->assertJsonStructure(['message']);

        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
        $this->assertSame(['laptop'], $user->tokens()->pluck('name')->all());
    }
}
