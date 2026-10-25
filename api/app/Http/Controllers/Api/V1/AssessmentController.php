<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Assessment;
use App\Models\Course;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AssessmentController extends TenantController
{
    /**
     * @return Collection<int, Assessment>
     */
    public function index(Course $course): Collection
    {
        Gate::authorize('grades.view');
        $this->ensureCanSeeCourse($course);

        return $course->assessments()
            ->withCount('questions')
            ->when(! $this->membership()->role->isStaff(), fn ($q) => $q->whereNotNull('published_at'))
            ->orderBy('due_at')
            ->get();
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('grades.write');

        $assessment = $course->assessments()->create($this->validated($request));

        return response()->json($assessment, 201);
    }

    public function update(Request $request, Assessment $assessment): Assessment
    {
        Gate::authorize('grades.write');

        $assessment->update($this->validated($request, $assessment));

        return $assessment;
    }

    public function destroy(Assessment $assessment): JsonResponse
    {
        Gate::authorize('grades.write');

        $assessment->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Assessment $assessment = null): array
    {
        $required = $assessment ? 'sometimes' : 'required';

        return $request->validate([
            'id' => [$assessment ? 'prohibited' : 'nullable', 'uuid'],
            'title' => [$required, 'string', 'max:190'],
            'type' => ['sometimes', Rule::in(['assignment', 'quiz', 'exam', 'project', 'participation'])],
            'max_score' => ['sometimes', 'numeric', 'min:1', 'max:100000'],
            'weight' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'due_at' => ['nullable', 'date'],
            'published_at' => ['nullable', 'date'],
        ]);
    }
}
