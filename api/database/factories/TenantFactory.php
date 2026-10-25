<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Guardianship;
use App\Models\Membership;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'name' => fake()->company().' School',
            'type' => fake()->randomElement(Tenant::TYPES),
        ];
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }

    /**
     * Adds a member with the given role and returns the user. For parents, pass
     * `guardian_of_id` (one child) or `children` (several) to link them.
     */
    public static function addMember(Tenant $tenant, Role $role, ?User $user = null, array $attributes = []): User
    {
        $user ??= User::factory()->create();
        $children = $attributes['children'] ?? (isset($attributes['guardian_of_id']) ? [$attributes['guardian_of_id']] : []);
        unset($attributes['children'], $attributes['guardian_of_id']);

        Membership::create(['tenant_id' => $tenant->id, 'user_id' => $user->id, 'role' => $role, ...$attributes]);
        foreach ($children as $studentId) {
            Guardianship::create(['tenant_id' => $tenant->id, 'guardian_id' => $user->id, 'student_id' => $studentId]);
        }

        return $user;
    }
}
