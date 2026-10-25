<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\LiveLesson;
use App\Services\LiveLessons;
use App\Services\Video\VideoProviders;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LiveLessonController extends TenantController
{
    public function __construct(private LiveLessons $lessons, private VideoProviders $providers) {}

    /**
     * A course's lessons: upcoming and live first, then past ones with recordings.
     */
    public function index(Course $course): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($course);

        $lessons = $course->liveLessons()
            ->with('host:id,name')
            ->withCount(['attendees', 'recordings' => fn ($q) => $q->where('status', 'ready')])
            ->orderByRaw("case when status in ('scheduled','live') then 0 else 1 end")
            ->orderByRaw("case when status in ('scheduled','live') then scheduled_at end asc")
            ->orderByDesc('scheduled_at')
            ->limit(100)
            ->get();

        return response()->json($lessons->map(fn (LiveLesson $l) => $this->present($l)));
    }

    /**
     * Upcoming and live lessons across all of the caller's courses (dashboard).
     */
    public function upcoming(): JsonResponse
    {
        $courseIds = Course::query()->visibleTo($this->membership())->select('id');

        $lessons = LiveLesson::query()
            ->upcoming()
            ->whereIn('course_id', $courseIds)
            ->with(['course:id,title,code', 'host:id,name'])
            ->orderBy('scheduled_at')
            ->limit(20)
            ->get()
            ->filter(fn (LiveLesson $l) => $l->status === 'live' || $l->endsAt()->isFuture())
            ->values();

        return response()->json($lessons->map(fn (LiveLesson $l) => $this->present($l)));
    }

    /**
     * One lesson with its published recordings (lesson page).
     */
    public function show(LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($lesson->course);
        $isStaff = $this->membership()->role->isStaff();

        $lesson->load(['course:id,title,code', 'host:id,name'])->loadCount('attendees');
        $recordings = $lesson->recordings()
            ->when(! $isStaff, fn ($q) => $q->where('status', 'ready')->whereNotNull('published_at'))
            ->latest()
            ->get();

        return response()->json([...$this->present($lesson), 'recordings' => $recordings]);
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        $lesson = $this->lessons->schedule($course, $this->validated($request), $request->user());

        return response()->json($this->present($lesson->load('host:id,name')), 201);
    }

    public function update(Request $request, LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.manage');

        return response()->json($this->present($this->lessons->reschedule($lesson, $this->validated($request, $lesson))));
    }

    public function destroy(LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.manage');
        $this->lessons->cancel($lesson);

        return response()->json(null, 204);
    }

    /**
     * Host starts the lesson: marks it live, notifies students, and returns the
     * host link (Zoom start URL, or the Jitsi room).
     */
    public function start(LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.manage');
        abort_unless(in_array($lesson->status, ['scheduled', 'live'], true), 422, __('This lesson can no longer be started.'));

        $this->lessons->markStarted($lesson);

        return response()->json(['host_url' => $lesson->host_url, 'passcode' => $lesson->passcode, 'lesson' => $this->present($lesson->fresh())]);
    }

    public function end(LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.manage');
        $this->lessons->markEnded($lesson);
        // Best effort: the lesson is already ended on our side either way.
        rescue(fn () => $this->providers->get($lesson->provider)->endMeeting($lesson));

        return response()->json($this->present($lesson->fresh()));
    }

    public function join(Request $request, LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($lesson->course);

        return response()->json($this->lessons->join($lesson, $request->user()));
    }

    /**
     * Who joined, for the teacher.
     */
    public function attendees(LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('attendance.view');
        abort_unless($this->membership()->role->isStaff(), 403);

        $joined = $lesson->attendees()->with('user:id,name')->get()->keyBy('user_id');
        $enrolled = $lesson->course->students()->orderBy('name')->get(['users.id', 'users.name']);

        return response()->json($enrolled->map(fn ($student) => [
            'id' => $student->id,
            'name' => $student->name,
            'joined' => $joined->has($student->id),
            'first_joined_at' => $joined[$student->id]->first_joined_at ?? null,
            'join_count' => $joined[$student->id]->join_count ?? 0,
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?LiveLesson $lesson = null): array
    {
        $required = $lesson ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'scheduled_at' => [$required, 'date', 'after:-5 minutes'],
            'duration_minutes' => ['sometimes', 'integer', 'min:10', 'max:480'],
            'auto_record' => ['sometimes', 'boolean'],
            ...$this->planRules(),
        ]);
    }

    /**
     * The lesson plan can be written before the lesson and completed after it
     * (homework, summary), so it is editable whatever the lesson's status.
     */
    public function plan(Request $request, LiveLesson $lesson): JsonResponse
    {
        Gate::authorize('courses.manage');

        $lesson->update($request->validate($this->planRules()));

        return response()->json($this->present($lesson->load('course', 'host')));
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function planRules(): array
    {
        return [
            'unit' => ['nullable', 'string', 'max:150'],
            'objectives' => ['nullable', 'array', 'max:12'],
            'objectives.*' => ['string', 'max:255'],
            'homework' => ['nullable', 'string', 'max:5000'],
            'homework_due_at' => ['nullable', 'date'],
            'resources' => ['nullable', 'array', 'max:12'],
            'resources.*.title' => ['required', 'string', 'max:150'],
            'resources.*.url' => ['required', 'url:http,https', 'max:2000'],
            'summary' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(LiveLesson $lesson): array
    {
        return [
            'id' => $lesson->id,
            'course_id' => $lesson->course_id,
            'course' => $lesson->relationLoaded('course') ? $lesson->course?->only(['id', 'title', 'code']) : null,
            'title' => $lesson->title,
            'description' => $lesson->description,
            'unit' => $lesson->unit,
            'objectives' => $lesson->objectives ?? [],
            'homework' => $lesson->homework,
            'homework_due_at' => $lesson->homework_due_at,
            'resources' => $lesson->resources ?? [],
            'summary' => $lesson->summary,
            'scheduled_at' => $lesson->scheduled_at,
            'ends_at' => $lesson->endsAt(),
            'duration_minutes' => $lesson->duration_minutes,
            'status' => $lesson->status,
            'started_at' => $lesson->started_at,
            'ended_at' => $lesson->ended_at,
            'provider' => $lesson->provider,
            'auto_record' => $lesson->auto_record,
            'joinable' => $lesson->isJoinable(),
            'host' => $lesson->relationLoaded('host') ? $lesson->host?->only(['id', 'name']) : null,
            'attendees_count' => $lesson->attendees_count ?? null,
            'recordings_count' => $lesson->recordings_count ?? null,
        ];
    }
}
