<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\AcademicLevel;
use App\Models\Attendance;
use App\Models\ClassGroup;
use App\Models\Course;
use App\Models\Membership;
use App\Models\User;
use App\Services\AcademicStanding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * School and university structure (stages, levels, class groups), academic
 * settings, report cards, attendance standing and rankings.
 */
class AcademicController extends TenantController
{
    public function __construct(private AcademicStanding $standing) {}

    public function structure(): JsonResponse
    {
        Gate::authorize('courses.view');

        $levels = AcademicLevel::query()
            ->withCount('courses')
            ->with(['groups' => fn ($q) => $q->with('advisor:id,name')->withCount(['students', 'courses'])])
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        $assigned = DB::table('class_group_student')->where('tenant_id', $this->tenant()->id)->count();

        return response()->json([
            'type' => $this->tenant()->type,
            'stages' => AcademicLevel::STAGES,
            'settings' => AcademicStanding::settings($this->tenant()),
            'levels' => $levels,
            'students_count' => $this->studentIds()->count(),
            'unassigned_students' => max(0, $this->studentIds()->count() - $assigned),
        ]);
    }

    public function storeLevel(Request $request): JsonResponse
    {
        Gate::authorize('members.manage');

        return response()->json(AcademicLevel::create($this->validatedLevel($request)), 201);
    }

    public function updateLevel(Request $request, AcademicLevel $level): AcademicLevel
    {
        Gate::authorize('members.manage');
        $level->update($this->validatedLevel($request, $level));

        return $level;
    }

    public function destroyLevel(AcademicLevel $level): JsonResponse
    {
        Gate::authorize('members.manage');
        $level->delete();

        return response()->json(null, 204);
    }

    public function group(ClassGroup $group): JsonResponse
    {
        Gate::authorize('courses.manage');

        $group->load(['level', 'advisor:id,name', 'students' => fn ($q) => $q->select('users.id', 'users.name', 'users.email')->orderBy('name'), 'courses' => fn ($q) => $q->with('teacher:id,name')->orderBy('title')]);

        return response()->json($group);
    }

    public function storeGroup(Request $request, AcademicLevel $level): JsonResponse
    {
        Gate::authorize('members.manage');

        return response()->json($level->groups()->create($this->validatedGroup($request, $level)), 201);
    }

    public function updateGroup(Request $request, ClassGroup $group): ClassGroup
    {
        Gate::authorize('members.manage');
        $group->update($this->validatedGroup($request, $group->level, $group));

        return $group;
    }

    public function destroyGroup(ClassGroup $group): JsonResponse
    {
        Gate::authorize('members.manage');
        $group->delete();

        return response()->json(null, 204);
    }

    /**
     * Sets who is in a class. Students move here from any other class, and can
     * be enrolled in every subject taught to the class at the same time.
     */
    public function syncStudents(Request $request, ClassGroup $group): JsonResponse
    {
        Gate::authorize('members.manage');

        $data = $request->validate([
            'student_ids' => ['present', 'array', 'max:1000'],
            'student_ids.*' => ['integer'],
            'enroll' => ['sometimes', 'boolean'],
        ]);

        $ids = $this->studentIds()->intersect($data['student_ids'])->values();
        $tenantId = $this->tenant()->id;

        DB::transaction(function () use ($group, $ids, $tenantId, $data): void {
            DB::table('class_group_student')->where('class_group_id', $group->id)->whereNotIn('student_id', $ids)->delete();
            DB::table('class_group_student')->where('tenant_id', $tenantId)->whereIn('student_id', $ids)->where('class_group_id', '!=', $group->id)->delete();
            $existing = DB::table('class_group_student')->where('class_group_id', $group->id)->pluck('student_id');
            $group->students()->attach($ids->diff($existing)->mapWithKeys(fn ($id) => [$id => ['tenant_id' => $tenantId]])->all());

            if ($data['enroll'] ?? false) {
                foreach ($group->courses as $course) {
                    foreach ($ids as $id) {
                        $course->enrollments()->firstOrCreate(['student_id' => $id]);
                    }
                }
            }
        });

        return response()->json(['students' => $ids->count()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        Gate::authorize('tenant.manage');

        $data = $request->validate([
            'grading_scale' => ['sometimes', Rule::in(['percent', 'gpa'])],
            'late_after_minutes' => ['sometimes', 'integer', 'min:0', 'max:120'],
            'absence_warning_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'absence_limit_percent' => ['sometimes', 'integer', 'min:1', 'max:100', 'gte:absence_warning_percent'],
            'rankings_visible' => ['sometimes', 'boolean'],
            'rankings_top' => ['sometimes', 'integer', 'min:3', 'max:50'],
        ]);

        $tenant = $this->tenant();
        $settings = $tenant->settings ?? [];
        $settings['academic'] = [...(array) ($settings['academic'] ?? []), ...$data];
        $tenant->update(['settings' => $settings]);

        return response()->json(AcademicStanding::settings($tenant));
    }

    /**
     * Ranking of students in the whole school, a level, a class or one subject.
     * Staff see everyone; students and parents see the top of the list and
     * their own place, when the school allows it.
     */
    public function rankings(Request $request): JsonResponse
    {
        Gate::authorize('grades.view');

        $data = $request->validate([
            'scope' => ['sometimes', Rule::in(['school', 'level', 'group', 'course'])],
            'id' => ['required_if:scope,level,group,course', 'nullable', 'string'],
        ]);
        $scope = $data['scope'] ?? 'school';
        $membership = $this->membership();
        $settings = AcademicStanding::settings($this->tenant());
        $staff = $membership->role->isStaff();

        abort_unless($staff || $settings['rankings_visible'], 403, __('Rankings are not shared with students at this school.'));

        [$label, $studentIds, $courses] = $this->scope($scope, $data['id'] ?? null);
        if (! $staff) {
            abort_unless($studentIds->contains($membership->learnerId()), 403);
        }

        $results = $this->standing->results($this->tenant(), $courses, $studentIds->all());
        $rows = $scope === 'course'
            ? $this->standing->rank($results->map(fn ($r) => ['student_id' => $r['student_id'], 'average' => $r['percent'], 'gpa' => $r['points'], 'letter' => $r['letter'], 'attendance_rate' => $r['attendance']['rate'], 'courses' => 1, 'standing' => null]))
            : $this->standing->rank($this->standing->overall($results)->values(), AcademicStanding::rankBy($this->tenant()));
        $rows = $this->withGroups($rows);

        $me = $staff ? null : $rows->firstWhere('student_id', $membership->learnerId());
        if (! $staff) {
            $rows = $rows->whereNotNull('rank')->take($settings['rankings_top'])
                ->map(fn ($r) => collect($r)->only(['rank', 'student_id', 'name', 'average', 'gpa', 'letter', 'class_group'])->all())->values();
        }

        return response()->json([
            'scope' => $scope,
            'id' => $data['id'] ?? null,
            'label' => $label,
            'total' => $studentIds->count(),
            'grading_scale' => $settings['grading_scale'],
            'rows' => $rows->values(),
            'me' => $me,
        ]);
    }

    /**
     * A student's results in every subject, overall average / GPA, rank and attendance.
     */
    public function reportCard(Request $request): JsonResponse
    {
        Gate::authorize('grades.view');

        $membership = $this->membership();
        $studentId = $membership->role->isStaff() ? $request->integer('student_id') : $membership->learnerId();
        abort_unless($studentId && $this->studentIds()->contains($studentId), 404);

        $student = User::findOrFail($studentId, ['id', 'name', 'email']);
        $group = ClassGroup::query()->with('level', 'advisor:id,name')
            ->whereIn('id', DB::table('class_group_student')->where('student_id', $studentId)->select('class_group_id'))
            ->first();

        $courses = Course::query()->with('teacher:id,name')->where('is_archived', false)
            ->whereHas('enrollments', fn ($q) => $q->where('student_id', $studentId))
            ->orderBy('title')
            ->get();

        // Everyone in the same subjects, to place the student in each one.
        $results = $this->standing->results($this->tenant(), $courses);
        $mine = $results->where('student_id', $studentId)->keyBy('course_id');
        $overall = $this->standing->overall($mine->values())->first();

        $subjects = $courses->map(function (Course $course) use ($results, $mine, $studentId) {
            $ranked = $this->standing->rank($results->where('course_id', $course->id)->map(fn ($r) => ['student_id' => $r['student_id'], 'average' => $r['percent'], 'attendance_rate' => $r['attendance']['rate']])->values());

            return [
                'course' => [
                    ...$course->only(['id', 'title', 'code', 'subject', 'term', 'credit_hours', 'pass_percent']),
                    'teacher' => $course->teacher?->only(['id', 'name']),
                ],
                ...collect($mine[$course->id] ?? [])->except(['course_id', 'student_id'])->all(),
                'rank' => $ranked->firstWhere('student_id', $studentId)['rank'] ?? null,
                'of' => $ranked->count(),
            ];
        })->values();

        $absences = Attendance::query()
            ->where('student_id', $studentId)
            ->whereIn('status', ['absent', 'late', 'excused'])
            ->whereIn('class_session_id', DB::table('class_sessions')->whereIn('course_id', $courses->pluck('id'))->select('id'))
            ->with('session:id,course_id,starts_at,topic')
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (Attendance $a) => [
                'id' => $a->id,
                'status' => $a->status,
                'note' => $a->note,
                'date' => $a->session?->starts_at,
                'topic' => $a->session?->topic,
                'course' => $courses->firstWhere('id', $a->session?->course_id)?->only(['id', 'title', 'subject']),
            ])
            ->sortByDesc('date')
            ->values();

        return response()->json([
            'student' => $student,
            'class_group' => $group ? [...$group->only(['id', 'name', 'room']), 'level' => $group->level?->only(['id', 'name', 'stage', 'department']), 'advisor' => $group->advisor?->only(['id', 'name'])] : null,
            'settings' => AcademicStanding::settings($this->tenant()),
            'subjects' => $subjects,
            'overall' => $overall,
            'ranks' => [
                'group' => $group ? $this->placeIn('group', $group->id, $studentId) : null,
                'level' => $group ? $this->placeIn('level', $group->academic_level_id, $studentId) : null,
                'school' => $this->placeIn('school', null, $studentId),
            ],
            'absences' => $absences,
        ]);
    }

    /**
     * Attendance standing per student, worst first, for the whole school, a level, a class or a subject.
     */
    public function attendance(Request $request): JsonResponse
    {
        Gate::authorize('attendance.view');
        abort_unless($this->membership()->role->isStaff(), 403);

        $data = $request->validate([
            'scope' => ['sometimes', Rule::in(['school', 'level', 'group', 'course'])],
            'id' => ['required_if:scope,level,group,course', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['warning', 'limit', 'flagged'])],
        ]);
        [$label, $studentIds, $courses] = $this->scope($data['scope'] ?? 'school', $data['id'] ?? null);

        $results = $this->standing->results($this->tenant(), $courses, $studentIds->all());
        $names = User::whereIn('id', $results->pluck('student_id'))->pluck('name', 'id');
        $order = ['limit' => 0, 'warning' => 1, 'ok' => 2];

        $rows = $results->groupBy('student_id')->map(function (Collection $rows, int $studentId) use ($names, $courses, $order) {
            $sessions = $rows->sum('attendance.sessions');
            $absent = $rows->sum('attendance.absent');
            $worst = $rows->pluck('attendance.status')->sortBy(fn ($s) => $order[$s])->first() ?? 'ok';

            return [
                'student_id' => $studentId,
                'name' => $names[$studentId] ?? '',
                'sessions' => $sessions,
                'present' => $rows->sum('attendance.present'),
                'late' => $rows->sum('attendance.late'),
                'absent' => $absent,
                'excused' => $rows->sum('attendance.excused'),
                'rate' => $sessions ? round(($rows->sum('attendance.present') + $rows->sum('attendance.late')) / $sessions * 100, 1) : null,
                'absence_percent' => $sessions ? round($absent / $sessions * 100, 1) : 0,
                'status' => $worst,
                'courses' => $rows->map(fn ($r) => [
                    'course' => $courses->firstWhere('id', $r['course_id'])?->only(['id', 'title', 'subject']),
                    ...$r['attendance'],
                ])->sortBy(fn ($r) => $order[$r['status']])->values(),
            ];
        })
            ->when(($data['status'] ?? null) === 'flagged', fn ($rows) => $rows->where('status', '!=', 'ok'))
            ->when(in_array($data['status'] ?? null, ['warning', 'limit'], true), fn ($rows) => $rows->where('status', $data['status']))
            ->sortBy([fn ($a, $b) => $order[$a['status']] <=> $order[$b['status']], fn ($a, $b) => $b['absence_percent'] <=> $a['absence_percent']])
            ->values();

        return response()->json([
            'label' => $label,
            'settings' => AcademicStanding::settings($this->tenant()),
            'rows' => $this->withGroups($rows),
            'totals' => [
                'students' => $rows->count(),
                'warning' => $rows->where('status', 'warning')->count(),
                'limit' => $rows->where('status', 'limit')->count(),
                'rate' => round((float) $rows->whereNotNull('rate')->avg('rate'), 1),
            ],
        ]);
    }

    /**
     * Resolves a ranking scope to a label, the students in it and the subjects that count.
     *
     * @return array{0: string, 1: Collection<int, int>, 2: Collection<int, Course>}
     */
    private function scope(string $scope, ?string $id): array
    {
        $active = Course::query()->where('is_archived', false);

        switch ($scope) {
            case 'course':
                $course = Course::findOrFail($id);
                $this->ensureCanSeeCourse($course);

                return [$course->title, $course->enrollments()->pluck('student_id')->map(fn ($v) => (int) $v), collect([$course])];
            case 'group':
                $group = ClassGroup::findOrFail($id);
                $ids = DB::table('class_group_student')->where('class_group_id', $group->id)->pluck('student_id')->map(fn ($v) => (int) $v);

                return [$group->name, $ids, $active->whereHas('enrollments', fn ($q) => $q->whereIn('student_id', $ids))->get()];
            case 'level':
                $level = AcademicLevel::findOrFail($id);
                $ids = DB::table('class_group_student')->whereIn('class_group_id', $level->groups()->select('id'))->pluck('student_id')->map(fn ($v) => (int) $v);

                return [$level->name, $ids, $active->whereHas('enrollments', fn ($q) => $q->whereIn('student_id', $ids))->get()];
            default:
                return [$this->tenant()->name, $this->studentIds(), $active->get()];
        }
    }

    /**
     * @return array{rank: int|null, of: int}
     */
    private function placeIn(string $scope, ?string $id, int $studentId): array
    {
        [, $ids, $courses] = $this->scope($scope, $id);
        $ranked = $this->standing->rank($this->standing->overall($this->standing->results($this->tenant(), $courses, $ids->all()))->values(), AcademicStanding::rankBy($this->tenant()));

        return ['rank' => $ranked->firstWhere('student_id', $studentId)['rank'] ?? null, 'of' => $ranked->count()];
    }

    /**
     * Adds each student's class name to ranking rows.
     *
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function withGroups(Collection $rows): Collection
    {
        $groups = DB::table('class_group_student')
            ->join('class_groups', 'class_groups.id', '=', 'class_group_student.class_group_id')
            ->whereIn('class_group_student.student_id', $rows->pluck('student_id'))
            ->where('class_group_student.tenant_id', $this->tenant()->id)
            ->pluck('class_groups.name', 'class_group_student.student_id');

        return $rows->map(fn (array $row) => [...$row, 'class_group' => $groups[$row['student_id']] ?? null]);
    }

    /**
     * @return Collection<int, int>
     */
    private function studentIds(): Collection
    {
        return Membership::query()->where('tenant_id', $this->tenant()->id)->where('role', Role::Student)->pluck('user_id')->map(fn ($v) => (int) $v);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedLevel(Request $request, ?AcademicLevel $level = null): array
    {
        $required = $level ? 'sometimes' : 'required';

        return $request->validate([
            'stage' => [$required, Rule::in(AcademicLevel::STAGES)],
            'name' => [$required, 'string', 'max:80'],
            'department' => ['nullable', 'string', 'max:120'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedGroup(Request $request, AcademicLevel $level, ?ClassGroup $group = null): array
    {
        $required = $group ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:60', Rule::unique('class_groups')->where('academic_level_id', $level->id)->ignore($group?->id)],
            'advisor_id' => ['nullable', 'integer', Rule::exists('memberships', 'user_id')->where('tenant_id', $this->tenant()->id)->whereIn('role', [Role::Owner->value, Role::Admin->value, Role::Teacher->value])],
            'room' => ['nullable', 'string', 'max:60'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);
    }
}
