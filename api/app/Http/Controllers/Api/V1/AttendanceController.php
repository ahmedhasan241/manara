<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Services\AcademicRecords;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AttendanceController extends TenantController
{
    public function sessions(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('attendance.view');
        $this->ensureCanSeeCourse($course);

        $membership = $this->membership();

        $sessions = $course->sessions()
            ->with(['attendances' => fn ($q) => $membership->role->isStaff() ? $q : $q->where('student_id', $membership->learnerId())])
            ->when($request->query('from'), fn ($q, $from) => $q->where('starts_at', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->where('starts_at', '<=', $to))
            ->orderByDesc('starts_at')
            ->limit(200)
            ->get();

        return response()->json($sessions);
    }

    public function storeSession(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('attendance.write');

        $data = $request->validate([
            'id' => ['nullable', 'uuid'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'topic' => ['nullable', 'string', 'max:190'],
        ]);

        return response()->json($course->sessions()->create($data), 201);
    }

    /**
     * Records attendance for many students in one session.
     */
    public function mark(Request $request, ClassSession $session, AcademicRecords $records): JsonResponse
    {
        Gate::authorize('attendance.write');

        $data = $request->validate([
            'records' => ['required', 'array', 'max:500'],
            'records.*.student_id' => ['required', 'integer'],
            'records.*.status' => ['required', Rule::in(Attendance::STATUSES)],
            'records.*.note' => ['nullable', 'string', 'max:255'],
        ]);

        $this->ensureEnrolled($session->course, array_column($data['records'], 'student_id'));

        $saved = DB::transaction(fn () => collect($data['records'])
            ->map(fn (array $input) => $records->recordAttendance($session, $input, $request->user())['record'])
            ->values());

        return response()->json($saved);
    }

    /**
     * Attendance rate per student for a course.
     */
    public function summary(Course $course): JsonResponse
    {
        Gate::authorize('attendance.view');
        $this->ensureCanSeeCourse($course);

        $membership = $this->membership();

        $rows = Attendance::query()
            ->whereIn('class_session_id', $course->sessions()->select('id'))
            ->when(! $membership->role->isStaff(), fn ($q) => $q->where('student_id', $membership->learnerId()))
            ->selectRaw('student_id, count(*) as total')
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->groupBy('student_id')
            ->with('student:id,name')
            ->get()
            ->map(fn (Attendance $row) => [
                'student_id' => $row->student_id,
                'student_name' => $row->student?->name,
                'total' => (int) $row->total,
                'attended' => (int) $row->attended,
                'absent' => (int) $row->absent,
                'rate' => $row->total ? round($row->attended / $row->total * 100, 1) : null,
            ]);

        return response()->json($rows);
    }
}
