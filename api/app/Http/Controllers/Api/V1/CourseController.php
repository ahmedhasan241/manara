<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\Course;
use App\Models\Membership;
use App\Models\User;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CourseController extends TenantController
{
    public function index(Request $request): LengthAwarePaginator
    {
        Gate::authorize('courses.view');

        return Course::query()
            ->visibleTo($this->membership())
            ->with(['teacher:id,name', 'academicLevel:id,name,stage,department', 'classGroup:id,name'])
            ->withCount(['enrollments', 'assessments', 'materials', 'reviews', ...Course::lessonCounts()])
            ->withAvg('reviews', 'rating')
            ->when($request->query('category'), fn ($q, $category) => $q->where('category', $category))
            ->when($request->query('search'), fn ($q, $search) => $q->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%")))
            ->when(! $request->boolean('archived'), fn ($q) => $q->where('is_archived', false))
            ->orderBy('title')
            ->paginate(min($request->integer('per_page', 25), 100));
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('courses.manage');

        $course = Course::create($this->validated($request));

        return response()->json($course, 201);
    }

    public function show(Course $course): Course
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($course);

        return $course->load(['teacher:id,name', 'academicLevel:id,name,stage,department', 'classGroup:id,name'])
            ->loadCount(['enrollments', 'assessments', 'materials', 'reviews', ...Course::lessonCounts()])
            ->loadAvg('reviews', 'rating');
    }

    public function update(Request $request, Course $course): Course
    {
        Gate::authorize('courses.manage');

        $course->update($this->validated($request, $course));

        return $course;
    }

    public function destroy(Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        $course->delete();

        return response()->json(null, 204);
    }

    public function students(Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        return response()->json($course->students()->select('users.id', 'users.name', 'users.email')->orderBy('name')->get());
    }

    public function enroll(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        $data = $request->validate([
            'student_ids' => ['required', 'array', 'max:500'],
            'student_ids.*' => ['integer'],
        ]);

        $studentIds = Membership::query()
            ->whereIn('user_id', $data['student_ids'])
            ->where('role', Role::Student)
            ->pluck('user_id');

        foreach ($studentIds as $studentId) {
            $course->enrollments()->firstOrCreate(['student_id' => $studentId]);
            // Enrolled students also get the recorded course in "My learning".
            if ($course->is_public) {
                app(Marketplace::class)->grant(User::findOrFail($studentId), $course, 'enrollment');
            }
        }

        return response()->json(['enrolled' => $studentIds->count()]);
    }

    public function unenroll(Course $course, int $student): JsonResponse
    {
        Gate::authorize('courses.manage');

        $course->enrollments()->where('student_id', $student)->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Course $course = null): array
    {
        $required = $course ? 'sometimes' : 'required';

        return $request->validate([
            'id' => [$course ? 'prohibited' : 'nullable', 'uuid'],
            'code' => [$required, 'string', 'max:40'],
            'title' => [$required, 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'term' => ['nullable', 'string', 'max:60'],
            'category' => ['nullable', 'string', 'max:60'],
            'subject' => ['nullable', 'string', 'max:120'],
            'academic_level_id' => ['nullable', 'uuid', Rule::exists('academic_levels', 'id')->where('tenant_id', $this->tenant()->id)],
            'class_group_id' => ['nullable', 'uuid', Rule::exists('class_groups', 'id')->where('tenant_id', $this->tenant()->id)],
            'credit_hours' => ['nullable', 'numeric', 'min:0', 'max:30'],
            'periods_per_week' => ['nullable', 'integer', 'min:0', 'max:40'],
            'pass_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'teacher_id' => ['nullable', 'integer', Rule::exists('memberships', 'user_id')->where('tenant_id', $this->tenant()->id)],
            'is_archived' => ['sometimes', 'boolean'],
        ]);
    }
}
