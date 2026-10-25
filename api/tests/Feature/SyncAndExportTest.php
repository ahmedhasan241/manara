<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SyncAndExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_offline_attendance_push_is_idempotent_and_last_writer_wins(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = $this->member($tenant, Role::Teacher);
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();
        $session = ClassSession::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'starts_at' => now()]);
        $id = (string) Str::uuid();

        $change = fn (string $status, string $at) => ['changes' => [[
            'entity' => 'attendance',
            'id' => $id,
            'client_updated_at' => $at,
            'data' => ['class_session_id' => $session->id, 'student_id' => $student->id, 'status' => $status],
        ]]];

        $this->asMember($teacher, $tenant, 'POST', '/api/v1/sync/push', $change('late', now()->subMinutes(5)->toIso8601String()))
            ->assertOk()->assertJsonPath('results.0.status', 'applied');

        // Same change replayed: still one row.
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/sync/push', $change('late', now()->subMinutes(5)->toIso8601String()))
            ->assertOk();
        $this->assertSame(1, Attendance::withoutGlobalScopes()->count());

        // An older offline edit loses to the newer one already on the server.
        $this->asMember($teacher, $tenant, 'POST', '/api/v1/sync/push', $change('absent', now()->subMinutes(30)->toIso8601String()))
            ->assertOk()
            ->assertJsonPath('results.0.status', 'conflict')
            ->assertJsonPath('results.0.server.status', 'late');

        $this->asMember($teacher, $tenant, 'GET', '/api/v1/sync/pull')
            ->assertOk()
            ->assertJsonCount(1, 'attendances')
            ->assertJsonStructure(['cursor', 'courses', 'grades', 'materials', 'announcements']);
    }

    public function test_student_cannot_push_attendance(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();
        $session = ClassSession::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'starts_at' => now()]);

        $this->asMember($student, $tenant, 'POST', '/api/v1/sync/push', ['changes' => [[
            'entity' => 'attendance',
            'id' => (string) Str::uuid(),
            'client_updated_at' => now()->toIso8601String(),
            'data' => ['class_session_id' => $session->id, 'student_id' => $student->id, 'status' => 'present'],
        ]]])->assertForbidden();
    }

    public function test_attendance_csv_export(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->member($tenant, Role::Admin);
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();
        $session = ClassSession::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'starts_at' => now(), 'topic' => 'Fractions']);
        Attendance::create(['tenant_id' => $tenant->id, 'class_session_id' => $session->id, 'student_id' => $student->id, 'status' => 'present']);

        $csv = $this->asMember($admin, $tenant, 'GET', "/api/v1/exports/courses/{$course->id}/attendance.csv")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->streamedContent();

        $this->assertStringContainsString('Date,Topic,Student,Status,Note', $csv);
        $rows = array_map('str_getcsv', array_filter(explode("\n", ltrim($csv, "\xEF\xBB\xBF"))));
        $this->assertSame(['Fractions', $student->name, 'present'], array_slice($rows[1], 1, 3));
    }
}
