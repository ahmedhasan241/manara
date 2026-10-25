<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Material;
use App\Services\AcademicRecords;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Offline sync for mobile and the PWA.
 *
 * pull: everything the caller may see that changed after `since`, plus a new cursor.
 * push: a batch of queued offline writes. Each change carries a client UUID and
 * timestamp, so replays are idempotent and the later write wins.
 */
class SyncController extends TenantController
{
    private const int PULL_LIMIT = 1000;

    public function pull(Request $request): JsonResponse
    {
        $request->validate(['since' => ['nullable', 'date']]);

        $since = $request->query('since') ? Carbon::parse($request->query('since')) : Carbon::createFromTimestamp(0);
        $cursor = now();
        $membership = $this->membership();
        $isStaff = $membership->role->isStaff();
        $courseIds = Course::query()->visibleTo($membership)->pluck('id');

        $changed = fn ($query) => $query->where('updated_at', '>', $since)->where('updated_at', '<=', $cursor)->limit(self::PULL_LIMIT);

        return response()->json([
            'cursor' => $cursor->toIso8601String(),
            'courses' => $changed(Course::withTrashed()->whereIn('id', $courseIds))->get(),
            'assessments' => $changed(Assessment::withTrashed()->whereIn('course_id', $courseIds)->when(! $isStaff, fn ($q) => $q->whereNotNull('published_at')))->get(),
            'grades' => $changed(Grade::query()
                ->whereIn('assessment_id', Assessment::whereIn('course_id', $courseIds)->when(! $isStaff, fn ($q) => $q->whereNotNull('published_at'))->select('id'))
                ->when(! $isStaff, fn ($q) => $q->where('student_id', $membership->learnerId())))->get(),
            'class_sessions' => $changed(ClassSession::whereIn('course_id', $courseIds))->get(),
            'attendances' => $changed(Attendance::query()
                ->whereIn('class_session_id', ClassSession::whereIn('course_id', $courseIds)->select('id'))
                ->when(! $isStaff, fn ($q) => $q->where('student_id', $membership->learnerId())))->get(),
            'materials' => $changed(Material::withTrashed()->whereIn('course_id', $courseIds)->when(! $isStaff, fn ($q) => $q->whereNotNull('published_at')))->get(),
            'announcements' => $changed(Announcement::query()->whereNotNull('published_at')->where(fn ($q) => $q->whereNull('course_id')->orWhereIn('course_id', $courseIds)))->get(),
        ]);
    }

    public function push(Request $request, AcademicRecords $records): JsonResponse
    {
        $data = $request->validate([
            'changes' => ['required', 'array', 'max:500'],
            'changes.*.entity' => ['required', Rule::in(['grade', 'attendance'])],
            'changes.*.id' => ['required', 'uuid'],
            'changes.*.client_updated_at' => ['required', 'date', 'before_or_equal:'.now()->addMinutes(5)->toIso8601String()],
            'changes.*.data' => ['required', 'array'],
        ]);

        $results = [];
        foreach ($data['changes'] as $change) {
            try {
                $results[] = $this->apply($change, $records, $request);
            } catch (ValidationException $e) {
                $results[] = ['id' => $change['id'], 'status' => 'rejected', 'errors' => $e->errors()];
            }
        }

        return response()->json(['results' => $results, 'cursor' => now()->toIso8601String()]);
    }

    /**
     * @param  array{entity: string, id: string, client_updated_at: string, data: array<string, mixed>}  $change
     * @return array<string, mixed>
     */
    private function apply(array $change, AcademicRecords $records, Request $request): array
    {
        if ($change['entity'] === 'grade') {
            Gate::authorize('grades.write');
            $input = validator($change['data'], [
                'assessment_id' => ['required', 'uuid'],
                'student_id' => ['required', 'integer'],
                'score' => ['nullable', 'numeric', 'min:0'],
                'feedback' => ['nullable', 'string', 'max:5000'],
            ])->validate();

            $assessment = Assessment::find($input['assessment_id']) ?? throw ValidationException::withMessages(['assessment_id' => __('Unknown assessment.')]);
            if ($input['score'] !== null && $input['score'] > $assessment->max_score) {
                throw ValidationException::withMessages(['score' => __('Score is above the maximum.')]);
            }
            $this->ensureEnrolled($assessment->course, [$input['student_id']]);

            $result = $records->recordGrade($assessment, [...$input, 'id' => $change['id'], 'client_updated_at' => $change['client_updated_at']], $request->user());
        } else {
            Gate::authorize('attendance.write');
            $input = validator($change['data'], [
                'class_session_id' => ['required', 'uuid'],
                'student_id' => ['required', 'integer'],
                'status' => ['required', Rule::in(Attendance::STATUSES)],
                'note' => ['nullable', 'string', 'max:255'],
            ])->validate();

            $session = ClassSession::find($input['class_session_id']) ?? throw ValidationException::withMessages(['class_session_id' => __('Unknown class session.')]);
            $this->ensureEnrolled($session->course, [$input['student_id']]);

            $result = $records->recordAttendance($session, [...$input, 'id' => $change['id'], 'client_updated_at' => $change['client_updated_at']], $request->user());
        }

        return [
            'id' => $change['id'],
            'status' => $result['applied'] ? 'applied' : 'conflict',
            'server' => $result['record'],
        ];
    }
}
