<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Events\LiveLessonUpdated;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\AbsenceRecorded;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AcademicTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Event::fake([LiveLessonUpdated::class]);
        $this->tenant = Tenant::factory()->create(['type' => 'university']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<User>  $students
     */
    private function course(array $attributes, array $students): Course
    {
        $course = Course::factory()->create(['tenant_id' => $this->tenant->id, ...$attributes]);
        foreach ($students as $student) {
            $course->enrollments()->create(['tenant_id' => $this->tenant->id, 'student_id' => $student->id]);
        }

        return $course;
    }

    /**
     * @param  array<int, float|int>  $scores  student id => score
     */
    private function assessment(Course $course, float $max, float $weight, array $scores): void
    {
        $assessment = Assessment::create(['tenant_id' => $this->tenant->id, 'course_id' => $course->id, 'title' => 'Test', 'max_score' => $max, 'weight' => $weight, 'published_at' => now()]);
        foreach ($scores as $studentId => $score) {
            Grade::create(['tenant_id' => $this->tenant->id, 'assessment_id' => $assessment->id, 'student_id' => $studentId, 'score' => $score]);
        }
    }

    /**
     * @param  array<int, string>  $statuses  student id => status
     */
    private function classSession(Course $course, array $statuses): void
    {
        $session = ClassSession::create(['tenant_id' => $this->tenant->id, 'course_id' => $course->id, 'starts_at' => now()->subDay()]);
        foreach ($statuses as $studentId => $status) {
            Attendance::create(['tenant_id' => $this->tenant->id, 'class_session_id' => $session->id, 'student_id' => $studentId, 'status' => $status]);
        }
    }

    public function test_admins_build_levels_and_classes_and_place_students(): void
    {
        $owner = $this->member($this->tenant, Role::Owner);
        $teacher = $this->member($this->tenant, Role::Teacher);
        [$amal, $omar] = [$this->member($this->tenant, Role::Student), $this->member($this->tenant, Role::Student)];

        $this->asMember($teacher, $this->tenant, 'POST', '/api/v1/academic/levels', ['stage' => 'undergraduate', 'name' => 'Year 1'])->assertForbidden();

        $level = $this->asMember($owner, $this->tenant, 'POST', '/api/v1/academic/levels', ['stage' => 'undergraduate', 'name' => 'Year 1', 'department' => 'Engineering'])->assertCreated()->json('id');
        $this->asMember($owner, $this->tenant, 'POST', '/api/v1/academic/levels', ['stage' => 'moon', 'name' => 'X'])->assertUnprocessable();
        $group = $this->asMember($owner, $this->tenant, 'POST', "/api/v1/academic/levels/{$level}/groups", ['name' => 'Group A', 'advisor_id' => $teacher->id])->assertCreated()->json('id');
        $this->asMember($owner, $this->tenant, 'POST', "/api/v1/academic/levels/{$level}/groups", ['name' => 'Group A'])->assertUnprocessable();
        $this->asMember($owner, $this->tenant, 'POST', "/api/v1/academic/levels/{$level}/groups", ['name' => 'Group B', 'advisor_id' => $amal->id])->assertUnprocessable();

        // A subject taught to the class, then students placed and enrolled in it.
        $course = $this->asMember($owner, $this->tenant, 'POST', '/api/v1/courses', ['code' => 'MATH-101', 'title' => 'Calculus I', 'subject' => 'Mathematics', 'academic_level_id' => $level, 'class_group_id' => $group, 'credit_hours' => 3])
            ->assertCreated()->assertJsonPath('credit_hours', 3)->json('id');
        $this->asMember($owner, $this->tenant, 'PUT', "/api/v1/academic/groups/{$group}/students", ['student_ids' => [$amal->id, $omar->id], 'enroll' => true])->assertOk()->assertJsonPath('students', 2);
        $this->assertSame(2, Course::find($course)->enrollments()->count());

        $this->asMember($teacher, $this->tenant, 'GET', '/api/v1/academic/structure')
            ->assertOk()
            ->assertJsonPath('settings.grading_scale', 'gpa')
            ->assertJsonPath('levels.0.department', 'Engineering')
            ->assertJsonPath('levels.0.groups.0.students_count', 2)
            ->assertJsonPath('levels.0.groups.0.advisor.id', $teacher->id)
            ->assertJsonPath('unassigned_students', 0);

        // Moving Omar to another class takes him out of the first one.
        $other = $this->asMember($owner, $this->tenant, 'POST', "/api/v1/academic/levels/{$level}/groups", ['name' => 'Group B'])->json('id');
        $this->asMember($owner, $this->tenant, 'PUT', "/api/v1/academic/groups/{$other}/students", ['student_ids' => [$omar->id]])->assertOk();
        $this->asMember($teacher, $this->tenant, 'GET', "/api/v1/academic/groups/{$group}")->assertOk()->assertJsonCount(1, 'students')->assertJsonPath('courses.0.subject', 'Mathematics');
    }

    public function test_report_cards_weight_marks_and_rank_students(): void
    {
        $teacher = $this->member($this->tenant, Role::Teacher);
        $amal = tap($this->member($this->tenant, Role::Student))->update(['name' => 'Amal']);
        $omar = tap($this->member($this->tenant, Role::Student))->update(['name' => 'Omar']);
        $sara = tap($this->member($this->tenant, Role::Student))->update(['name' => 'Sara']);
        $parent = $this->member($this->tenant, Role::Parent, ['guardian_of_id' => $sara->id]);

        $calculus = $this->course(['title' => 'Calculus', 'credit_hours' => 3, 'pass_percent' => 50], [$amal, $omar, $sara]);
        $writing = $this->course(['title' => 'Writing', 'credit_hours' => 1, 'pass_percent' => 50], [$amal, $omar, $sara]);

        // Calculus: a quiz (weight 1) and a final (weight 3).
        $this->assessment($calculus, 20, 1, [$amal->id => 20, $omar->id => 10, $sara->id => 10]);
        $this->assessment($calculus, 100, 3, [$amal->id => 90, $omar->id => 40, $sara->id => 40]);
        // Writing: one essay.
        $this->assessment($writing, 10, 1, [$amal->id => 8, $omar->id => 6, $sara->id => 6]);
        // Sara missed 2 of 4 Calculus lessons.
        foreach ([['present', 'absent'], ['present', 'absent'], ['present', 'present'], ['late', 'present']] as [$others, $saraStatus]) {
            $this->classSession($calculus, [$amal->id => $others, $omar->id => $others, $sara->id => $saraStatus]);
        }

        $card = $this->asMember($teacher, $this->tenant, 'GET', "/api/v1/academic/report-card?student_id={$amal->id}")->assertOk()->json();
        $calc = collect($card['subjects'])->firstWhere('course.title', 'Calculus');
        // (1 × 20/20 + 3 × 90/100) / 4 = 92.5%
        $this->assertEquals(92.5, $calc['percent']);
        $this->assertEquals(['A', 4.0, true, 1, 3], [$calc['letter'], $calc['points'], $calc['passed'], $calc['rank'], $calc['of']]);
        // Credit-weighted: (92.5 × 3 + 80 × 1) / 4 = 89.38; GPA (4.0 × 3 + 3.3 × 1) / 4 = 3.83
        $this->assertEquals(89.38, $card['overall']['average']);
        $this->assertEquals(3.83, $card['overall']['gpa']);
        $this->assertSame(['rank' => 1, 'of' => 3], $card['ranks']['school']);

        // Omar and Sara tie (47.5% calculus fails, 60% writing): shared second place.
        $rows = $this->asMember($teacher, $this->tenant, 'GET', '/api/v1/academic/rankings')->assertOk()->json('rows');
        $this->assertSame([1, 2, 2], array_column($rows, 'rank'));
        $this->assertSame('Omar', $rows[1]['name'], 'Ties are broken by attendance for display.');

        // Sara: failing Calculus and over the 25% absence limit → at risk; her parent can see it.
        $this->asMember($parent, $this->tenant, 'GET', '/api/v1/academic/report-card')
            ->assertOk()
            ->assertJsonPath('student.id', $sara->id)
            ->assertJsonPath('overall.standing', 'at_risk')
            ->assertJsonPath('overall.failing', 1)
            ->assertJsonCount(2, 'absences');

        $this->asMember($teacher, $this->tenant, 'GET', "/api/v1/academic/attendance?scope=course&id={$calculus->id}&status=flagged")
            ->assertOk()->assertJsonCount(1, 'rows')->assertJsonPath('rows.0.name', 'Sara')->assertJsonPath('rows.0.status', 'limit')->assertJsonPath('totals.limit', 1);

        // Students see the top of the list and their own place, not everyone's details.
        $view = $this->asMember($omar, $this->tenant, 'GET', '/api/v1/academic/rankings')->assertOk();
        $view->assertJsonPath('me.rank', 2)->assertJsonMissingPath('rows.0.attendance_rate')->assertJsonMissingPath('rows.0.standing');
        $this->asMember($omar, $this->tenant, 'GET', "/api/v1/academic/report-card?student_id={$amal->id}")->assertOk()->assertJsonPath('student.id', $omar->id);
        $this->asMember($omar, $this->tenant, 'GET', '/api/v1/academic/attendance')->assertForbidden();

        // The school can keep rankings to staff.
        $owner = $this->member($this->tenant, Role::Owner);
        $this->asMember($owner, $this->tenant, 'PATCH', '/api/v1/academic/settings', ['rankings_visible' => false, 'absence_limit_percent' => 5])->assertUnprocessable();
        $this->asMember($owner, $this->tenant, 'PATCH', '/api/v1/academic/settings', ['rankings_visible' => false])->assertOk();
        $this->asMember($omar, $this->tenant, 'GET', '/api/v1/academic/rankings')->assertForbidden();
        $this->asMember($teacher, $this->tenant, 'GET', "/api/v1/academic/rankings?scope=course&id={$calculus->id}")->assertOk()->assertJsonPath('rows.0.name', 'Amal');

        // The teacher's day flags Sara.
        $calculus->update(['teacher_id' => $teacher->id]);
        $overview = $this->asMember($teacher, $this->tenant, 'GET', '/api/v1/teaching/overview')->assertOk();
        $overview->assertJsonCount(1, 'classes')->assertJsonPath('top_students.0.name', 'Amal');
        $this->assertContains('Sara', array_column($overview->json('at_risk'), 'name'));
        $this->asMember($amal, $this->tenant, 'GET', '/api/v1/teaching/overview')->assertForbidden();
    }

    public function test_online_lessons_carry_a_plan_and_mark_late_and_absent_students(): void
    {
        $teacher = $this->member($this->tenant, Role::Teacher);
        $course = $this->courseWithStudents($this->tenant, 3);
        [$onTime, $late, $absent] = $course->students()->orderBy('users.id')->get()->all();
        $parent = $this->member($this->tenant, Role::Parent, ['guardian_of_id' => $absent->id]);
        $startsAt = now()->addHour()->startOfMinute();

        $id = $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", [
            'title' => 'Limits', 'scheduled_at' => $startsAt->toIso8601String(),
            'unit' => 'Unit 2: Limits', 'objectives' => ['Define a limit', 'Evaluate one-sided limits'],
            'resources' => [['title' => 'Worksheet', 'url' => 'https://example.com/limits.pdf']],
        ])->assertCreated()->assertJsonPath('unit', 'Unit 2: Limits')->assertJsonCount(2, 'objectives')->json('id');

        $this->travelTo($startsAt);
        $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/start")->assertOk();
        $this->asMember($onTime, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertOk();
        $this->travelTo($startsAt->copy()->addMinutes(15));
        $this->asMember($late, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertOk();
        $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/end")->assertOk();

        $status = Attendance::withoutGlobalScopes()->pluck('status', 'student_id');
        $this->assertSame(['present', 'late', 'absent'], [$status[$onTime->id], $status[$late->id], $status[$absent->id]]);
        Notification::assertSentTo($parent, AbsenceRecorded::class);
        Notification::assertNotSentTo($onTime, AbsenceRecorded::class);

        // Homework and a summary are added after the lesson.
        $this->asMember($teacher, $this->tenant, 'PATCH', "/api/v1/live-lessons/{$id}/plan", ['homework' => 'Exercises 2.1–2.4', 'summary' => 'Covered limits graphically.'])
            ->assertOk()->assertJsonPath('homework', 'Exercises 2.1–2.4')->assertJsonPath('status', 'ended');
        $this->asMember($onTime, $this->tenant, 'PATCH', "/api/v1/live-lessons/{$id}/plan", ['homework' => 'none'])->assertForbidden();
        $this->asMember($onTime, $this->tenant, 'GET', "/api/v1/live-lessons/{$id}")->assertOk()->assertJsonPath('summary', 'Covered limits graphically.');
    }
}
