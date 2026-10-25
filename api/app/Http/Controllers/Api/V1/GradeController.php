<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Grade;
use App\Services\AcademicRecords;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class GradeController extends TenantController
{
    /**
     * Grades for a course. Staff get the whole gradebook, learners only their own
     * grades on published assessments.
     */
    public function index(Course $course): JsonResponse
    {
        Gate::authorize('grades.view');
        $this->ensureCanSeeCourse($course);

        $membership = $this->membership();

        $grades = Grade::query()
            ->whereHas('assessment', function ($q) use ($course, $membership) {
                $q->where('course_id', $course->id);
                if (! $membership->role->isStaff()) {
                    $q->whereNotNull('published_at');
                }
            })
            ->when(! $membership->role->isStaff(), fn ($q) => $q->where('student_id', $membership->learnerId()))
            ->with('student:id,name')
            ->get()
            ->map(fn (Grade $grade) => [
                'id' => $grade->id,
                'assessment_id' => $grade->assessment_id,
                'student_id' => $grade->student_id,
                'student_name' => $grade->student?->name,
                'score' => $grade->score,
                'feedback' => $grade->feedback,
                'updated_at' => $grade->updated_at,
            ]);

        return response()->json($grades);
    }

    /**
     * Saves a batch of grades for one assessment.
     */
    public function upsert(Request $request, Assessment $assessment, AcademicRecords $records): JsonResponse
    {
        Gate::authorize('grades.write');

        $data = $request->validate([
            'grades' => ['required', 'array', 'max:500'],
            'grades.*.student_id' => ['required', 'integer'],
            'grades.*.score' => ['nullable', 'numeric', 'min:0', 'max:'.$assessment->max_score],
            'grades.*.feedback' => ['nullable', 'string', 'max:5000'],
        ]);

        $this->ensureEnrolled($assessment->course, array_column($data['grades'], 'student_id'));

        $saved = DB::transaction(fn () => collect($data['grades'])
            ->map(fn (array $input) => $records->recordGrade($assessment, $input, $request->user())['record'])
            ->values());

        return response()->json($saved);
    }
}
