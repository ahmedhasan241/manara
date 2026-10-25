<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\Course;
use App\Models\LiveLesson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

/**
 * One feed for the calendar: online lessons, assessment due dates and
 * announcement deadlines in the courses this member can see.
 */
class CalendarController extends TenantController
{
    /** Longest range one request may ask for. */
    private const int MAX_DAYS = 62;

    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('courses.view');

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after:from'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from']) : now()->startOfMonth();
        $to = isset($data['to']) ? Carbon::parse($data['to']) : $from->copy()->endOfMonth();
        abort_if($from->diffInDays($to) > self::MAX_DAYS, 422, 'Ask for at most '.self::MAX_DAYS.' days at a time.');

        $membership = $this->membership();
        $courses = Course::query()->visibleTo($membership)->get(['id', 'title', 'code'])->keyBy('id');
        $courseIds = $courses->keys();
        $course = fn (?string $id) => $id && $courses->has($id) ? ['id' => $id, 'title' => $courses[$id]->title, 'code' => $courses[$id]->code] : null;

        $lessons = LiveLesson::whereIn('course_id', $courseIds)
            ->where('status', '!=', 'canceled')
            ->whereBetween('scheduled_at', [$from, $to])
            ->get()
            ->map(fn (LiveLesson $lesson) => [
                'id' => "lesson-{$lesson->id}",
                'type' => 'lesson',
                'title' => $lesson->title,
                'starts_at' => $lesson->scheduled_at,
                'ends_at' => $lesson->endsAt(),
                'status' => $lesson->status,
                'course' => $course($lesson->course_id),
                'target_id' => $lesson->id,
            ]);

        $assessments = Assessment::whereIn('course_id', $courseIds)
            ->whereBetween('due_at', [$from, $to])
            ->when(! $membership->role->isStaff(), fn ($q) => $q->whereNotNull('published_at'))
            ->get()
            ->map(fn (Assessment $assessment) => [
                'id' => "assessment-{$assessment->id}",
                'type' => 'assessment',
                'title' => $assessment->title,
                'starts_at' => $assessment->due_at,
                'ends_at' => null,
                'status' => $assessment->type,
                'course' => $course($assessment->course_id),
                'target_id' => $assessment->id,
            ]);

        $deadlines = Announcement::whereNotNull('published_at')
            ->whereBetween('deadline_at', [$from, $to])
            ->where(fn ($q) => $q->whereNull('course_id')->orWhereIn('course_id', $courseIds))
            ->get()
            ->map(fn (Announcement $announcement) => [
                'id' => "deadline-{$announcement->id}",
                'type' => 'deadline',
                'title' => $announcement->title,
                'starts_at' => $announcement->deadline_at,
                'ends_at' => null,
                'status' => $announcement->priority,
                'course' => $course($announcement->course_id),
                'target_id' => $announcement->id,
            ]);

        return response()->json([
            'from' => $from,
            'to' => $to,
            'events' => $lessons->concat($assessments)->concat($deadlines)->sortBy('starts_at')->values(),
        ]);
    }
}
