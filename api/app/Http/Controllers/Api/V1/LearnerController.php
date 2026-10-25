<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Guardianship;
use App\Models\LiveLesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * The student and family view: one learner's progress across all their courses.
 * Students see themselves; parents see the child picked with the X-Student header.
 */
class LearnerController extends TenantController
{
    /** Below these, the overview raises a gentle alert. */
    private const int ATTENDANCE_ALERT = 80;

    private const int GRADE_ALERT = 60;

    /**
     * Who this account can follow: the student themself, or a parent's children.
     */
    public function children(): JsonResponse
    {
        $membership = $this->membership();
        abort_if($membership->role->isStaff(), 403, __('This view is for students and families.'));

        $ids = $membership->role === Role::Parent ? $membership->childIds() : [$membership->user_id];
        $relationships = Guardianship::where('guardian_id', $membership->user_id)->pluck('relationship', 'student_id');

        return response()->json(User::whereIn('id', $ids)->orderBy('name')->get(['id', 'name'])->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'relationship' => $relationships[$u->id] ?? null,
            'selected' => $u->id === $membership->learnerId(),
        ]));
    }

    public function overview(): JsonResponse
    {
        $membership = $this->membership();
        abort_if($membership->role->isStaff(), 403, __('This view is for students and families.'));

        $studentId = $membership->learnerId();
        if ($studentId === null) {
            return response()->json(['student' => null, 'courses' => [], 'upcoming_lessons' => [], 'recent_grades' => [], 'deadlines' => [], 'alerts' => [], 'totals' => null]);
        }

        $courses = Course::query()
            ->visibleTo($membership)
            ->with('teacher:id,name')
            ->withCount(['reviews', ...Course::lessonCounts()])
            ->withAvg('reviews', 'rating')
            ->orderBy('title')
            ->get();
        $courseIds = $courses->modelKeys();

        $assessments = Assessment::whereIn('course_id', $courseIds)->whereNotNull('published_at')->get()->keyBy('id');
        $grades = Grade::where('student_id', $studentId)->whereIn('assessment_id', $assessments->keys())->whereNotNull('score')->get();
        $attendance = Attendance::where('student_id', $studentId)->with('session:id,course_id,starts_at')->get();
        $lessons = LiveLesson::upcoming()->whereIn('course_id', $courseIds)->orderBy('scheduled_at')->get();

        $courseRows = $courses->map(function (Course $course) use ($assessments, $grades, $attendance, $lessons) {
            $courseGrades = $grades->filter(fn (Grade $g) => $assessments[$g->assessment_id]->course_id === $course->id);
            $courseAttendance = $attendance->filter(fn (Attendance $a) => $a->session?->course_id === $course->id);
            $next = $lessons->firstWhere('course_id', $course->id);

            return [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'teacher' => $course->teacher?->name,
                'category' => $course->category,
                'description' => $course->description,
                'lessons_count' => $course->lessons_count,
                'lessons_done_count' => $course->lessons_done_count,
                'rating' => $course->reviews_avg_rating === null ? null : round((float) $course->reviews_avg_rating, 1),
                'reviews_count' => $course->reviews_count,
                'grade_average' => $this->weightedAverage($courseGrades, $assessments),
                'graded_count' => $courseGrades->count(),
                'attendance_rate' => $this->attendanceRate($courseAttendance),
                'grade_trend' => $courseGrades
                    ->sortBy(fn (Grade $g) => $assessments[$g->assessment_id]->due_at ?? $g->created_at)
                    ->map(fn (Grade $g) => round((float) $g->score / (float) $assessments[$g->assessment_id]->max_score * 100, 1))
                    ->values(),
                'next_lesson' => $next ? ['id' => $next->id, 'title' => $next->title, 'scheduled_at' => $next->scheduled_at, 'status' => $next->status] : null,
            ];
        });

        $alerts = $courseRows->flatMap(fn (array $c) => array_filter([
            $c['attendance_rate'] !== null && $c['attendance_rate'] < self::ATTENDANCE_ALERT
                ? ['type' => 'attendance', 'course' => $c['title'], 'message' => "Attendance in {$c['title']} is {$c['attendance_rate']}%."]
                : null,
            $c['grade_average'] !== null && $c['grade_average'] < self::GRADE_ALERT
                ? ['type' => 'grades', 'course' => $c['title'], 'message' => "Average in {$c['title']} is {$c['grade_average']}%."]
                : null,
        ]))->values();

        $recentGrades = $grades->sortByDesc('updated_at')->take(8)->map(function (Grade $g) use ($assessments, $courses) {
            $assessment = $assessments[$g->assessment_id];

            return [
                'id' => $g->id,
                'course' => $courses->firstWhere('id', $assessment->course_id)?->title,
                'assessment' => $assessment->title,
                'score' => (float) $g->score,
                'max_score' => (float) $assessment->max_score,
                'percent' => round((float) $g->score / (float) $assessment->max_score * 100, 1),
                'feedback' => $g->feedback,
                'graded_at' => $g->updated_at,
            ];
        })->values();

        $deadlines = Announcement::query()
            ->whereNotNull('published_at')
            ->where('deadline_at', '>', now())
            ->where(fn ($q) => $q->whereNull('course_id')->orWhereIn('course_id', $courseIds))
            ->orderBy('deadline_at')
            ->limit(6)
            ->get(['id', 'title', 'deadline_at', 'priority', 'course_id']);

        return response()->json([
            'student' => User::find($studentId, ['id', 'name']),
            'totals' => [
                'courses' => $courses->count(),
                'grade_average' => $this->weightedAverage($grades, $assessments),
                'attendance_rate' => $this->attendanceRate($attendance),
                'upcoming_lessons' => $lessons->count(),
            ],
            'courses' => $courseRows,
            'upcoming_lessons' => $lessons->take(6)->map(fn (LiveLesson $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'course' => $courses->firstWhere('id', $l->course_id)?->title,
                'scheduled_at' => $l->scheduled_at,
                'status' => $l->status,
                'joinable' => $l->isJoinable(),
            ])->values(),
            'recent_grades' => $recentGrades,
            'deadlines' => $deadlines,
            'alerts' => $alerts,
        ]);
    }

    /**
     * Weighted average percentage (each assessment's weight × score / max).
     *
     * @param  Collection<int, Grade>  $grades
     * @param  Collection<string, Assessment>  $assessments
     */
    private function weightedAverage(Collection $grades, Collection $assessments): ?float
    {
        $weights = $grades->sum(fn (Grade $g) => (float) $assessments[$g->assessment_id]->weight);
        if ($grades->isEmpty() || $weights <= 0) {
            return null;
        }

        $total = $grades->sum(fn (Grade $g) => (float) $g->score / (float) $assessments[$g->assessment_id]->max_score * (float) $assessments[$g->assessment_id]->weight);

        return round($total / $weights * 100, 1);
    }

    /**
     * @param  Collection<int, Attendance>  $records
     */
    private function attendanceRate(Collection $records): ?float
    {
        if ($records->isEmpty()) {
            return null;
        }

        return round($records->whereIn('status', ['present', 'late'])->count() / $records->count() * 100, 1);
    }
}
