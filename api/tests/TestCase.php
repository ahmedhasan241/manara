<?php

namespace Tests;

use App\Enums\Role;
use App\Models\Course;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Tenancy\CurrentTenant;
use Database\Factories\TenantFactory;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    protected function member(Tenant $tenant, Role $role, array $attributes = []): User
    {
        return TenantFactory::addMember($tenant, $role, null, $attributes);
    }

    protected function courseWithStudents(Tenant $tenant, int $students = 2): Course
    {
        $course = Course::factory()->create(['tenant_id' => $tenant->id]);
        foreach (range(1, $students) as $ignored) {
            $course->enrollments()->create(['tenant_id' => $tenant->id, 'student_id' => $this->member($tenant, Role::Student)->id]);
        }

        return $course;
    }

    /**
     * Sends a request as the user inside the given tenant.
     *
     * @param  array<string, mixed>  $data
     */
    protected function asMember(User $user, Tenant $tenant, string $method, string $uri, array $data = []): TestResponse
    {
        Sanctum::actingAs($user);
        $response = $this->json($method, $uri, $data, ['X-Tenant' => $tenant->slug]);
        app(CurrentTenant::class)->clear();

        return $response;
    }

    protected function seedPlan(): Plan
    {
        return Plan::factory()->create(['code' => 'teacher', 'sort_order' => 1]);
    }
}
