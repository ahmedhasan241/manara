<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Models\Course;
use App\Models\CourseReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Star ratings and reviews. Anyone who can see a course can read them; only
 * students enrolled in it can write one (one each, editable).
 */
class CourseReviewController extends TenantController
{
    public function index(Course $course): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($course);

        $reviews = $course->reviews()->with('user:id,name')->latest()->get();
        $userId = $this->membership()->user_id;
        $breakdown = collect(range(5, 1))->mapWithKeys(fn (int $stars) => [$stars => $reviews->where('rating', $stars)->count()]);

        return response()->json([
            'average' => $reviews->isEmpty() ? null : round($reviews->avg('rating'), 1),
            'count' => $reviews->count(),
            'breakdown' => $breakdown,
            'can_review' => $this->canReview($course),
            'reviews' => $reviews->map(fn (CourseReview $review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'author' => $review->user?->name,
                'mine' => $review->user_id === $userId,
                'created_at' => $review->created_at,
                'updated_at' => $review->updated_at,
            ])->values(),
        ]);
    }

    public function upsert(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($course);
        abort_unless($this->canReview($course), 403, __('Only students enrolled in this course can review it.'));

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = $course->reviews()->updateOrCreate(['user_id' => $this->membership()->user_id], $data);

        return response()->json($review, $review->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Course $course): JsonResponse
    {
        Gate::authorize('courses.view');
        $this->ensureCanSeeCourse($course);

        $course->reviews()->where('user_id', $this->membership()->user_id)->delete();

        return response()->json(null, 204);
    }

    private function canReview(Course $course): bool
    {
        $membership = $this->membership();

        return $membership->role === Role::Student
            && $course->enrollments()->where('student_id', $membership->user_id)->exists();
    }
}
