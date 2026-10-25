<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\CourseReview;
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\WishlistItem;
use App\Services\LearningStats;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Self-paced learning for any signed-in user, with or without a workspace:
 * "My learning", the course player, progress and reviews.
 */
class LearningController extends Controller
{
    public function __construct(private Marketplace $marketplace, private LearningStats $stats) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $accesses = CourseAccess::where('user_id', $user->id)->orderByDesc('last_viewed_at')->orderByDesc('created_at')->get();
        $courses = $this->marketplace->courses()->whereIn('courses.id', $accesses->pluck('course_id'))->get()->keyBy('id');
        $accesses = $accesses->filter(fn (CourseAccess $a) => $courses->has($a->course_id))->each(fn (CourseAccess $a) => $a->setRelation('course', $courses[$a->course_id]));
        $progress = $this->marketplace->progressFor($user, $accesses->pluck('course_id'));

        return response()->json($accesses->map(fn (CourseAccess $a) => [
            ...$this->marketplace->card($a->course),
            'source' => $a->source,
            'progress' => $progress[$a->course_id],
            'last_viewed_at' => $a->last_viewed_at,
            'acquired_at' => $a->created_at,
        ])->values());
    }

    /**
     * Whether the viewer owns a course (for the course page's buttons).
     */
    public function status(Request $request, string $slug): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->where('slug', $slug)->firstOrFail();
        $user = $request->user();

        return response()->json([
            'owned' => $this->marketplace->owns($user, $course),
            'can_watch' => $this->marketplace->canWatch($user, $course),
            'wishlisted' => WishlistItem::where('user_id', $user->id)->where('course_id', $course->id)->exists(),
            'review' => CourseReview::withoutGlobalScopes()->where('course_id', $course->id)->where('user_id', $user->id)->first(['rating', 'comment']),
        ]);
    }

    /**
     * The player: curriculum with completion ticks and where to resume.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        $course = $this->marketplace->courses()->where('slug', $slug)->firstOrFail();
        abort_unless($this->marketplace->canWatch($user, $course), 403, __('Get this course to start learning.'));

        CourseAccess::where('user_id', $user->id)->where('course_id', $course->id)->update(['last_viewed_at' => now()]);
        $completed = $this->marketplace->completedLectureIds($user, $course);
        $curriculum = $this->marketplace->curriculum($course, $completed, withMedia: true);
        $lectures = collect($curriculum)->flatMap(fn ($s) => $s['lectures']);
        $lastTouched = LectureProgress::where('user_id', $user->id)->where('course_id', $course->id)->latest('updated_at')->first();
        $resume = $lectures->firstWhere('completed', false)['id'] ?? $lastTouched?->lecture_id ?? $lectures->first()['id'] ?? null;

        return response()->json([
            ...$this->marketplace->card($course),
            'description' => $course->description,
            'outcomes' => $course->outcomes ?? [],
            'curriculum' => $curriculum,
            'progress' => ['done' => count($completed), 'total' => $lectures->count()],
            'resume_lecture_id' => $resume,
            'positions' => LectureProgress::where('user_id', $user->id)->where('course_id', $course->id)->pluck('position_seconds', 'lecture_id'),
            'review' => CourseReview::withoutGlobalScopes()->where('course_id', $course->id)->where('user_id', $user->id)->first(['rating', 'comment']),
            'owned' => $this->marketplace->owns($user, $course),
            'certificate' => Certificate::where('user_id', $user->id)->where('course_id', $course->id)->value('code'),
        ]);
    }

    public function play(Request $request, Lecture $lecture): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->findOrFail($lecture->course_id);
        abort_unless($lecture->is_preview || $this->marketplace->canWatch($request->user(), $course), 403, __('Get this course to watch this lecture.'));

        return response()->json(self::playback($lecture));
    }

    public function progress(Request $request, Lecture $lecture): JsonResponse
    {
        $user = $request->user();
        $course = Course::withoutGlobalScopes()->findOrFail($lecture->course_id);
        abort_unless($this->marketplace->canWatch($user, $course), 403);

        $data = $request->validate([
            'completed' => ['sometimes', 'boolean'],
            'position_seconds' => ['sometimes', 'integer', 'min:0'],
        ]);

        $progress = LectureProgress::firstOrNew(['user_id' => $user->id, 'lecture_id' => $lecture->id], ['course_id' => $course->id]);
        if (array_key_exists('position_seconds', $data)) {
            $this->stats->recordWatching($user, (int) $progress->position_seconds, $data['position_seconds']);
            $progress->position_seconds = $data['position_seconds'];
        }
        if (array_key_exists('completed', $data)) {
            if ($data['completed'] && $progress->completed_at === null) {
                $this->stats->recordCompletion($user);
            }
            $progress->completed_at = $data['completed'] ? ($progress->completed_at ?? now()) : null;
        }
        $progress->save();
        $summary = $this->marketplace->progressFor($user, collect([$course->id]))[$course->id];

        return response()->json([
            'lecture_id' => $lecture->id,
            'completed' => $progress->completed_at !== null,
            'progress' => $summary,
            'certificate' => $this->marketplace->certify($user, $course, $summary)?->code,
        ]);
    }

    /**
     * Learners who own a course can rate it (one review each, editable).
     */
    public function review(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        $course = Course::withoutGlobalScopes()->where('slug', $slug)->firstOrFail();
        abort_unless($this->marketplace->owns($user, $course), 403, __('Only learners who have this course can review it.'));

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = CourseReview::withoutGlobalScopes()->updateOrCreate(
            ['course_id' => $course->id, 'user_id' => $user->id],
            [...$data, 'tenant_id' => $course->tenant_id],
        );

        return response()->json($review, $review->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Where and how to play a lecture: a signed stream for uploaded files, the
     * link for hosted videos, or the text of an article.
     *
     * @return array<string, mixed>
     */
    public static function playback(Lecture $lecture): array
    {
        return [
            'id' => $lecture->id,
            'type' => $lecture->type,
            'title' => $lecture->title,
            'body' => $lecture->type === 'article' ? $lecture->body : null,
            'url' => $lecture->path
                ? URL::temporarySignedRoute('v1.lectures.stream', now()->addHours(4), ['lecture' => $lecture->id])
                : $lecture->video_url,
            'external' => $lecture->path === null && $lecture->video_url !== null,
            'mime_type' => $lecture->mime_type,
        ];
    }

    /**
     * The signed stream for uploaded lecture videos (supports seeking).
     */
    public function stream(string $lecture): mixed
    {
        $lecture = Lecture::withoutGlobalScopes()->findOrFail($lecture);
        abort_unless($lecture->path, 404);

        $disk = Storage::disk($lecture->disk);
        if (config("filesystems.disks.{$lecture->disk}.driver") === 's3') {
            return redirect()->away($disk->temporaryUrl($lecture->path, now()->addHours(4)));
        }

        return response()->file($disk->path($lecture->path), [
            'Content-Type' => $lecture->mime_type ?? 'video/mp4',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
