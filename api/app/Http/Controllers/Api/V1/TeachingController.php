<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\ExamAttempt;
use App\Models\LiveLesson;
use App\Models\User;
use App\Services\AcademicStanding;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * The teacher's (or professor's) day: lessons to teach, attendance still to
 * take, exams to mark, how each class is doing and who needs help.
 */
class TeachingController extends TenantController
{
    public function __invoke(AcademicStanding $standing): JsonResponse
    {
        Gate::authorize('courses.manage');

        $membership = $this->membership();
        $courses = Course::query()
            ->where('is_archived', false)
            ->when($membership->role === Role::Teacher, fn ($q) => $q->where('teacher_id', $membership->user_id))
            ->with(['academicLevel:id,name,stage', 'classGroup:id,name'])
            ->withCount(['enrollments', ...Course::lessonCounts()])
            ->orderBy('title')
            ->get();
        $courseIds = $courses->pluck('id');

        $today = LiveLesson::query()
            ->whereIn('course_id', $courseIds)
            ->whereIn('status', ['scheduled', 'live'])
            ->where('scheduled_at', '<=', now()->endOfDay())
            ->where('scheduled_at', '>=', now()->startOfDay()->subHours(2))
            ->with('course:id,title,code,subject')
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (LiveLesson $l) => [
                ...$l->only(['id', 'course_id', 'title', 'unit', 'objectives', 'homework', 'scheduled_at', 'duration_minutes', 'status']),
                'course' => $l->course?->only(['id', 'title', 'code', 'subject']),
                'joinable' => $l->isJoinable(),
            ]);

        $upcoming = LiveLesson::query()
            ->whereIn('course_id', $courseIds)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>', now()->endOfDay())
            ->with('course:id,title,subject')
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get(['id', 'course_id', 'title', 'unit', 'scheduled_at', 'duration_minutes']);

        $needsAttendance = ClassSession::query()
            ->whereIn('course_id', $courseIds)
            ->where('starts_at', '<=', now())
            ->where('starts_at', '>=', now()->subDays(14))
            ->doesntHave('attendances')
            ->with('course:id,title,subject')
            ->orderByDesc('starts_at')
            ->limit(10)
            ->get(['id', 'course_id', 'starts_at', 'topic']);

        $toReview = ExamAttempt::query()
            ->where('status', 'needs_review')
            ->whereHas('assessment', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with('assessment:id,course_id,title')
            ->get(['id', 'assessment_id', 'student_id', 'submitted_at'])
            ->groupBy('assessment_id')
            ->map(fn ($attempts) => [
                'assessment' => $attempts->first()->assessment->only(['id', 'course_id', 'title']),
                'course' => $courses->firstWhere('id', $attempts->first()->assessment->course_id)?->only(['id', 'title']),
                'count' => $attempts->count(),
                'oldest' => $attempts->min('submitted_at'),
            ])
            ->values();

        $results = $standing->results($this->tenant(), $courses);
        $overall = $standing->overall($results);
        $names = User::whereIn('id', $results->pluck('student_id'))->pluck('name', 'id');

        $classes = $courses->map(function (Course $course) use ($results) {
            $rows = $results->where('course_id', $course->id);
            $graded = $rows->whereNotNull('percent');

            return [
                ...$course->only(['id', 'title', 'code', 'subject', 'term', 'credit_hours', 'enrollments_count', 'lessons_count', 'lessons_done_count']),
                'level' => $course->academicLevel?->only(['id', 'name', 'stage']),
                'class_group' => $course->classGroup?->only(['id', 'name']),
                'average' => $graded->isEmpty() ? null : round($graded->avg('percent'), 1),
                'pass_rate' => $graded->isEmpty() ? null : round($graded->where('passed', true)->count() / $graded->count() * 100, 1),
                'attendance_rate' => round((float) $rows->pluck('attendance.rate')->filter(fn ($v) => $v !== null)->avg(), 1),
                'flagged' => $rows->filter(fn ($r) => $r['passed'] === false || $r['attendance']['status'] !== 'ok')->count(),
            ];
        })->values();

        // Students who are failing a subject or close to the absence limit.
        $atRisk = $results
            ->filter(fn ($r) => $r['passed'] === false || $r['attendance']['status'] !== 'ok')
            ->groupBy('student_id')
            ->map(fn ($rows, $id) => [
                'student_id' => $id,
                'name' => $names[$id] ?? '',
                'standing' => $overall[$id]['standing'] ?? 'warning',
                'average' => $overall[$id]['average'] ?? null,
                'attendance_rate' => $overall[$id]['attendance_rate'] ?? null,
                'reasons' => $rows->flatMap(fn ($r) => array_filter([
                    $r['passed'] === false ? ['type' => 'failing', 'course' => $courses->firstWhere('id', $r['course_id'])?->title, 'value' => $r['percent']] : null,
                    $r['attendance']['status'] !== 'ok' ? ['type' => "absence_{$r['attendance']['status']}", 'course' => $courses->firstWhere('id', $r['course_id'])?->title, 'value' => $r['attendance']['absence_percent']] : null,
                ]))->values(),
            ])
            ->sortBy(fn ($r) => [$r['standing'] === 'at_risk' ? 0 : 1, $r['average'] ?? 0])
            ->take(12)
            ->values();

        $top = $standing->rank($overall->values(), AcademicStanding::rankBy($this->tenant()))->whereNotNull('rank')->take(5)->values();

        return response()->json([
            'today' => $today,
            'upcoming' => $upcoming,
            'needs_attendance' => $needsAttendance,
            'to_review' => $toReview,
            'classes' => $classes,
            'at_risk' => $atRisk,
            'top_students' => $top,
            'totals' => [
                'courses' => $courses->count(),
                'students' => $results->pluck('student_id')->unique()->count(),
                'lessons_this_week' => LiveLesson::query()->whereIn('course_id', $courseIds)->where('status', '!=', 'canceled')->whereBetween('scheduled_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'average' => round((float) $results->whereNotNull('percent')->avg('percent'), 1),
                'attendance_rate' => round((float) $overall->pluck('attendance_rate')->filter(fn ($v) => $v !== null)->avg(), 1),
            ],
        ]);
    }
}
