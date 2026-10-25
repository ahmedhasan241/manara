<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Grade;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LearnerPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_follows_several_children_and_switches_between_them(): void
    {
        $tenant = Tenant::factory()->create();
        $maths = $this->courseWithStudents($tenant, 1);
        $science = $this->courseWithStudents($tenant, 1);
        $ali = $maths->students()->first();
        $lina = $science->students()->first();
        $stranger = $this->courseWithStudents($tenant, 1)->students()->first();
        $parent = $this->member($tenant, Role::Parent, ['children' => [$ali->id, $lina->id]]);

        $this->asMember($parent, $tenant, 'GET', '/api/v1/learner/children')
            ->assertOk()->assertJsonCount(2)->assertJsonFragment(['id' => $ali->id, 'selected' => true]);

        // Default child is the first linked one.
        $this->asMember($parent, $tenant, 'GET', '/api/v1/learner/overview')
            ->assertOk()->assertJsonPath('student.id', $ali->id)->assertJsonPath('courses.0.id', $maths->id);

        // Switching child with X-Student.
        Sanctum::actingAs($parent);
        $this->getJson('/api/v1/learner/overview', ['X-Tenant' => $tenant->slug, 'X-Student' => (string) $lina->id])
            ->assertOk()->assertJsonPath('student.id', $lina->id)->assertJsonPath('courses.0.id', $science->id);

        // Someone else's child is ignored: falls back to the parent's first child.
        $this->getJson('/api/v1/learner/overview', ['X-Tenant' => $tenant->slug, 'X-Student' => (string) $stranger->id])
            ->assertJsonPath('student.id', $ali->id);
    }

    public function test_overview_calculates_weighted_average_attendance_and_alerts(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();

        $quiz = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Quiz', 'max_score' => 10, 'weight' => 1, 'published_at' => now()]);
        $exam = Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Exam', 'max_score' => 100, 'weight' => 3, 'published_at' => now()]);
        Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Hidden', 'max_score' => 10, 'published_at' => null]);
        Grade::create(['tenant_id' => $tenant->id, 'assessment_id' => $quiz->id, 'student_id' => $student->id, 'score' => 8]);   // 80%
        Grade::create(['tenant_id' => $tenant->id, 'assessment_id' => $exam->id, 'student_id' => $student->id, 'score' => 40]);  // 40%

        foreach (['present', 'absent', 'absent', 'present'] as $i => $status) {
            $session = ClassSession::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'starts_at' => now()->subDays($i + 1)]);
            Attendance::create(['tenant_id' => $tenant->id, 'class_session_id' => $session->id, 'student_id' => $student->id, 'status' => $status]);
        }

        $this->asMember($student, $tenant, 'GET', '/api/v1/learner/overview')
            ->assertOk()
            ->assertJsonPath('totals.grade_average', 50) // (0.8×1 + 0.4×3) / 4
            ->assertJsonPath('courses.0.attendance_rate', 50)
            ->assertJsonPath('courses.0.graded_count', 2)
            ->assertJsonCount(2, 'alerts')
            ->assertJsonCount(2, 'recent_grades');
    }

    public function test_staff_use_the_staff_portal(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);

        $this->asMember($teacher, $tenant, 'GET', '/api/v1/learner/overview')->assertForbidden();
    }
}
