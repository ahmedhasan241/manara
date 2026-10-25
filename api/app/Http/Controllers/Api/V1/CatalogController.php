<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\CourseReview;
use App\Models\Lecture;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * The public course catalog: browse, search and read about every published
 * course from every teacher, lecturer, school and university. No sign-in.
 */
class CatalogController extends Controller
{
    public function __construct(private Marketplace $marketplace) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:60'],
            'level' => ['nullable', Rule::in(['beginner', 'intermediate', 'advanced', 'all'])],
            'price' => ['nullable', Rule::in(['free', 'paid'])],
            'organization' => ['nullable', 'string', 'max:60'],
            'instructor' => ['nullable', 'integer'],
            'sort' => ['nullable', Rule::in(['popular', 'newest', 'rating', 'price_low', 'price_high'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $courses = $this->marketplace->catalog()
            ->when($data['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('subtitle', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%")))
            ->when($data['category'] ?? null, fn ($q, $category) => $q->where('category', $category))
            ->when($data['level'] ?? null, fn ($q, $level) => $q->where('level', $level))
            ->when(($data['price'] ?? null) === 'free', fn ($q) => $q->where('price_cents', 0))
            ->when(($data['price'] ?? null) === 'paid', fn ($q) => $q->where('price_cents', '>', 0))
            ->when($data['organization'] ?? null, fn ($q, $slug) => $q->whereHas('tenant', fn ($q) => $q->where('slug', $slug)))
            ->when($data['instructor'] ?? null, fn ($q, $id) => $q->where('teacher_id', $id))
            ->when($data['sort'] ?? 'popular', fn ($q, $sort) => match ($sort) {
                'newest' => $q->orderByDesc('marketplace_published_at'),
                'rating' => $q->orderByDesc('reviews_avg_rating'),
                'price_low' => $q->orderBy('price_cents'),
                'price_high' => $q->orderByDesc('price_cents'),
                default => $q->orderByDesc('accesses_count')->orderByDesc('reviews_avg_rating'),
            })
            ->paginate($data['per_page'] ?? 12)
            ->withQueryString();

        return response()->json($courses->through(fn (Course $c) => $this->marketplace->card($c)));
    }

    public function show(string $slug): JsonResponse
    {
        $course = $this->marketplace->catalog()->where('slug', $slug)->firstOrFail();
        $reviews = CourseReview::withoutGlobalScopes()->where('course_id', $course->id)->with('user:id,name')->latest()->get();
        $instructorCourses = $course->teacher_id ? Course::withoutGlobalScopes()->onMarketplace()->where('teacher_id', $course->teacher_id)->pluck('id') : collect();

        return response()->json([
            ...$this->marketplace->card($course),
            'description' => $course->description,
            'outcomes' => $course->outcomes ?? [],
            'requirements' => $course->requirements ?? [],
            'updated_at' => $course->updated_at,
            'curriculum' => $this->marketplace->curriculum($course),
            'instructor_stats' => [
                'courses' => $instructorCourses->count(),
                'students' => CourseAccess::whereIn('course_id', $instructorCourses)->distinct('user_id')->count('user_id'),
                'reviews' => CourseReview::withoutGlobalScopes()->whereIn('course_id', $instructorCourses)->count(),
            ],
            'reviews' => [
                'average' => $reviews->isEmpty() ? null : round($reviews->avg('rating'), 1),
                'count' => $reviews->count(),
                'breakdown' => collect(range(5, 1))->mapWithKeys(fn (int $stars) => [$stars => $reviews->where('rating', $stars)->count()]),
                'latest' => $reviews->take(10)->map(fn (CourseReview $r) => [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                    'author' => $r->user?->name,
                    'created_at' => $r->updated_at,
                ])->values(),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json(
            Course::withoutGlobalScopes()->whereNull('deleted_at')->onMarketplace()->whereNotNull('category')
                ->selectRaw('category as name, count(*) as courses')->groupBy('category')->orderByDesc('courses')->get()
        );
    }

    /**
     * Schools, universities and independent teachers on Manara.
     */
    public function organizations(Request $request): JsonResponse
    {
        $type = $request->validate(['type' => ['nullable', Rule::in(Tenant::TYPES)]])['type'] ?? null;

        $tenants = Tenant::query()
            ->where('status', 'active')
            ->when($type, fn ($q) => $q->where('type', $type))
            ->withCount(['courses as public_courses_count' => fn ($q) => $q->withoutGlobalScopes()->onMarketplace()])
            ->orderByDesc('public_courses_count')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'type']);

        return response()->json($tenants->map(fn (Tenant $t) => [
            'name' => $t->name,
            'slug' => $t->slug,
            'type' => $t->type,
            'courses' => $t->public_courses_count,
        ]));
    }

    /**
     * Everyone who teaches a published course: teachers, lecturers and
     * doctors, with what they teach and how learners rate them.
     */
    public function instructors(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:60'],
            'type' => ['nullable', Rule::in(['school', 'university', 'teacher'])],
        ]);

        $courses = $this->marketplace->catalog()
            ->whereNotNull('teacher_id')
            ->with('teacher:id,name,headline')
            ->get();

        $instructors = $courses->groupBy('teacher_id')
            ->map(function ($taught) {
                $teacher = $taught->first()->teacher;
                $organization = $taught->pluck('tenant')->filter()->first();

                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'headline' => $teacher->headline,
                    'organization' => $organization ? ['name' => $organization->name, 'slug' => $organization->slug, 'type' => $organization->type] : null,
                    'categories' => $taught->pluck('category')->filter()->unique()->values(),
                    'courses' => $taught->count(),
                    'lectures' => (int) $taught->sum('lectures_count'),
                    'students' => (int) $taught->sum('accesses_count'),
                    'reviews' => (int) $taught->sum('reviews_count'),
                    'rating' => $this->averageRating($taught),
                ];
            })
            ->filter(fn (array $i) => ! isset($data['search']) || str($i['name'].' '.$i['headline'])->lower()->contains(str($data['search'])->lower()))
            ->filter(fn (array $i) => ! isset($data['category']) || $i['categories']->contains($data['category']))
            ->filter(fn (array $i) => ! isset($data['type']) || $i['organization']['type'] === $data['type'])
            ->sortByDesc('students')
            ->values();

        return response()->json($instructors);
    }

    /**
     * One teacher or doctor's public profile: who they are, their numbers,
     * what they teach, every published course, their free lessons and what
     * learners say.
     */
    public function instructor(User $user): JsonResponse
    {
        $courses = $this->marketplace->catalog()->where('teacher_id', $user->id)->get();
        abort_if($courses->isEmpty(), 404);

        $previews = Lecture::withoutGlobalScopes()
            ->whereIn('course_id', $courses->modelKeys())
            ->where('is_preview', true)
            ->orderBy('position')
            ->limit(8)
            ->get(['id', 'course_id', 'title', 'type', 'duration_seconds']);

        $reviews = CourseReview::withoutGlobalScopes()
            ->whereIn('course_id', $courses->modelKeys())
            ->with('user:id,name')
            ->latest()
            ->limit(6)
            ->get();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'headline' => $user->headline,
            'bio' => $user->bio,
            'teaching_since' => $courses->min('marketplace_published_at'),
            'organizations' => $courses->pluck('tenant')->filter()->unique('id')->map(fn ($t) => ['name' => $t->name, 'slug' => $t->slug, 'type' => $t->type])->values(),
            'categories' => $courses->pluck('category')->filter()->unique()->values(),
            'students' => CourseAccess::whereIn('course_id', $courses->modelKeys())->distinct('user_id')->count('user_id'),
            'rating' => $this->averageRating($courses),
            'reviews_count' => (int) $courses->sum('reviews_count'),
            'lectures_count' => (int) $courses->sum('lectures_count'),
            'duration_seconds' => (int) $courses->sum('lectures_sum_duration_seconds'),
            'courses' => $courses->map(fn (Course $c) => $this->marketplace->card($c))->values(),
            'previews' => $previews->map(fn (Lecture $l) => [
                'id' => $l->id,
                'title' => $l->title,
                'type' => $l->type,
                'duration_seconds' => $l->duration_seconds,
                'course' => ['title' => $courses->find($l->course_id)?->title, 'slug' => $courses->find($l->course_id)?->slug],
            ])->values(),
            'reviews' => $reviews->map(fn (CourseReview $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                // First name only: reviewers are learners, not public figures.
                'author' => $r->user ? str($r->user->name)->before(' ')->toString() : null,
                'course' => $courses->find($r->course_id)?->title,
                'created_at' => $r->created_at,
            ])->values(),
        ]);
    }

    /**
     * Average of the courses' ratings, ignoring courses nobody has rated yet.
     *
     * @param  Collection<int, Course>  $courses
     */
    private function averageRating(Collection $courses): ?float
    {
        $rated = $courses->filter(fn (Course $c) => $c->reviews_avg_rating !== null);

        return $rated->isEmpty() ? null : round((float) $rated->avg('reviews_avg_rating'), 1);
    }

    /**
     * Headline numbers for the website.
     */
    public function stats(): JsonResponse
    {
        $courses = Course::withoutGlobalScopes()->whereNull('deleted_at')->onMarketplace();

        return response()->json([
            'courses' => (clone $courses)->count(),
            'instructors' => (clone $courses)->whereNotNull('teacher_id')->distinct('teacher_id')->count('teacher_id'),
            'organizations' => Tenant::where('status', 'active')->count(),
            'learners' => CourseAccess::distinct('user_id')->count('user_id'),
            'lectures' => Lecture::withoutGlobalScopes()->whereIn('course_id', (clone $courses)->select('id'))->count(),
        ]);
    }

    /**
     * Free preview lectures can be played by anyone.
     */
    public function preview(Lecture $lecture): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->findOrFail($lecture->course_id);
        abort_unless($lecture->is_preview && $course->isOnMarketplace(), 404);

        return response()->json(LearningController::playback($lecture));
    }
}
