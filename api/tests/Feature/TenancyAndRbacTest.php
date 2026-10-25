<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Assessment;
use App\Models\Grade;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenancyAndRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_member_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $outsider = $this->member(Tenant::factory()->create(), Role::Admin);

        $this->asMember($outsider, $tenant, 'GET', '/api/v1/courses')->assertForbidden();
    }

    public function test_courses_from_another_tenant_are_not_found(): void
    {
        $mine = Tenant::factory()->create();
        $theirs = Tenant::factory()->create();
        $admin = $this->member($mine, Role::Admin);
        $foreignCourse = $this->courseWithStudents($theirs, 1);

        $this->asMember($admin, $mine, 'GET', "/api/v1/courses/{$foreignCourse->id}")->assertNotFound();
        $this->asMember($admin, $mine, 'GET', '/api/v1/courses')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_suspended_tenant_is_locked(): void
    {
        $tenant = Tenant::factory()->suspended()->create();
        $admin = $this->member($tenant, Role::Admin);

        $this->asMember($admin, $tenant, 'GET', '/api/v1/courses')->assertStatus(423);
    }

    public function test_student_cannot_write_grades(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();
        $assessment = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Quiz', 'max_score' => 10]);

        $this->asMember($student, $tenant, 'PUT', "/api/v1/assessments/{$assessment->id}/grades", [
            'grades' => [['student_id' => $student->id, 'score' => 10]],
        ])->assertForbidden();
    }

    public function test_teacher_grades_and_students_only_see_their_own(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $course = $this->courseWithStudents($tenant, 2);
        [$alice, $bob] = $course->students()->orderBy('users.id')->get()->all();
        $assessment = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Quiz', 'max_score' => 10, 'published_at' => now()]);

        $this->asMember($teacher, $tenant, 'PUT', "/api/v1/assessments/{$assessment->id}/grades", [
            'grades' => [
                ['student_id' => $alice->id, 'score' => 9, 'feedback' => 'Great work'],
                ['student_id' => $bob->id, 'score' => 6],
            ],
        ])->assertOk()->assertJsonCount(2);

        $this->asMember($alice, $tenant, 'GET', "/api/v1/courses/{$course->id}/grades")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.student_id', $alice->id)
            ->assertJsonPath('0.feedback', 'Great work');

        $this->assertSame(1, $alice->notifications()->count());

        // Feedback is encrypted at rest.
        $raw = Grade::withoutGlobalScopes()->toBase()->where('student_id', $alice->id)->value('feedback');
        $this->assertNotSame('Great work', $raw);
    }

    public function test_parent_sees_their_childs_courses_only(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $this->courseWithStudents($tenant, 1);
        $child = $course->students()->first();
        $parent = $this->member($tenant, Role::Parent, ['guardian_of_id' => $child->id]);

        $this->asMember($parent, $tenant, 'GET', '/api/v1/courses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $course->id);
    }

    public function test_grades_cannot_be_given_to_students_outside_the_course(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $course = $this->courseWithStudents($tenant, 1);
        $stranger = $this->member($tenant, Role::Student);
        $assessment = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Quiz', 'max_score' => 10]);

        $this->asMember($teacher, $tenant, 'PUT', "/api/v1/assessments/{$assessment->id}/grades", [
            'grades' => [['student_id' => $stranger->id, 'score' => 5]],
        ])->assertUnprocessable();
    }
}
