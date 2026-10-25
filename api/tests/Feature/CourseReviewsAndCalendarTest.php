<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\LiveLesson;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseReviewsAndCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_enrolled_students_rate_a_course_once_and_can_change_it(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 2);
        [$amal, $omar] = $course->students()->get()->all();

        $this->asMember($amal, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 5, 'comment' => 'Brilliant'])->assertCreated();
        $this->asMember($omar, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 3])->assertCreated();
        $this->asMember($omar, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 4])->assertOk();

        $this->asMember($amal, $tenant, 'GET', "/api/v1/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonPath('average', 4.5)
            ->assertJsonPath('count', 2)
            ->assertJsonPath('breakdown.5', 1)
            ->assertJsonPath('breakdown.4', 1)
            ->assertJsonPath('breakdown.3', 0)
            ->assertJsonPath('can_review', true);

        $this->asMember($amal, $tenant, 'GET', "/api/v1/courses/{$course->id}")
            ->assertJsonPath('reviews_count', 2);

        $this->asMember($amal, $tenant, 'DELETE', "/api/v1/courses/{$course->id}/reviews")->assertNoContent();
        $this->assertSame(1, $course->reviews()->count());
    }

    public function test_only_enrolled_students_may_review(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $student = $course->students()->first();
        $teacher = $this->member($tenant, Role::Teacher);
        $parent = $this->member($tenant, Role::Parent, ['children' => [$student->id]]);
        $outsider = $this->member($tenant, Role::Student);

        $this->asMember($teacher, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 5])->assertForbidden();
        $this->asMember($parent, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 5])->assertForbidden();
        $this->asMember($outsider, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 5])->assertNotFound();
        $this->asMember($student, $tenant, 'PUT', "/api/v1/courses/{$course->id}/reviews", ['rating' => 6])->assertUnprocessable();

        // Staff and parents can still read them.
        $this->asMember($teacher, $tenant, 'GET', "/api/v1/courses/{$course->id}/reviews")->assertOk()->assertJsonPath('can_review', false);
        $this->asMember($parent, $tenant, 'GET', "/api/v1/courses/{$course->id}/reviews")->assertOk();
    }

    public function test_calendar_lists_lessons_due_dates_and_deadlines_in_visible_courses(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        $other = Course::factory()->create(['tenant_id' => $tenant->id]);
        $student = $course->students()->first();
        $day = now()->addDays(3)->setTime(10, 0);

        LiveLesson::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Algebra live', 'scheduled_at' => $day, 'duration_minutes' => 45, 'status' => 'scheduled', 'provider' => 'jitsi']);
        LiveLesson::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Canceled', 'scheduled_at' => $day, 'duration_minutes' => 45, 'status' => 'canceled', 'provider' => 'jitsi']);
        LiveLesson::create(['tenant_id' => $tenant->id, 'course_id' => $other->id, 'title' => 'Not mine', 'scheduled_at' => $day, 'duration_minutes' => 45, 'status' => 'scheduled', 'provider' => 'jitsi']);
        Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Quiz 1', 'max_score' => 10, 'due_at' => $day->copy()->addDay(), 'published_at' => now()]);
        Assessment::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => 'Draft quiz', 'max_score' => 10, 'due_at' => $day->copy()->addDay()]);
        Announcement::create(['tenant_id' => $tenant->id, 'title' => 'Trip forms', 'body' => 'Bring them back', 'deadline_at' => $day->copy()->addDays(2), 'published_at' => now()]);

        $range = ['from' => now()->toDateString(), 'to' => now()->addDays(10)->toDateString()];
        $query = http_build_query($range);

        $this->asMember($student, $tenant, 'GET', "/api/v1/calendar?{$query}")
            ->assertOk()
            ->assertJsonCount(3, 'events')
            ->assertJsonPath('events.0.type', 'lesson')
            ->assertJsonPath('events.0.title', 'Algebra live')
            ->assertJsonPath('events.0.course.id', $course->id)
            ->assertJsonPath('events.1.title', 'Quiz 1')
            ->assertJsonPath('events.2.type', 'deadline');

        // Staff see every course and unpublished assessments too.
        $teacher = $this->member($tenant, Role::Teacher);
        $this->asMember($teacher, $tenant, 'GET', "/api/v1/calendar?{$query}")->assertOk()->assertJsonCount(5, 'events');

        $this->asMember($student, $tenant, 'GET', '/api/v1/calendar?from=2026-01-01&to=2026-06-01')->assertUnprocessable();
    }

    public function test_course_list_reports_lesson_progress(): void
    {
        $tenant = Tenant::factory()->create();
        $course = $this->courseWithStudents($tenant, 1);
        foreach (['ended', 'ended', 'scheduled', 'canceled'] as $i => $status) {
            LiveLesson::create(['tenant_id' => $tenant->id, 'course_id' => $course->id, 'title' => "Lesson {$i}", 'scheduled_at' => now()->addDays($i - 2), 'duration_minutes' => 45, 'status' => $status, 'provider' => 'jitsi']);
        }

        $this->asMember($course->students()->first(), $tenant, 'GET', '/api/v1/courses')
            ->assertOk()
            ->assertJsonPath('data.0.lessons_count', 3)
            ->assertJsonPath('data.0.lessons_done_count', 2);

        $this->asMember($course->students()->first(), $tenant, 'GET', '/api/v1/learner/overview')
            ->assertJsonPath('courses.0.lessons_count', 3)
            ->assertJsonPath('courses.0.lessons_done_count', 2);
    }
}
