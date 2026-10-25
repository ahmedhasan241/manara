<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\Enrollment;
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\Membership;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Shared rules of the course marketplace: what a course card shows, who may
 * watch a course, and how access is granted.
 */
class Marketplace
{
    /**
     * Published courses with everything a card needs, across all workspaces.
     *
     * @return Builder<Course>
     */
    public function catalog(): Builder
    {
        return $this->courses()->onMarketplace();
    }

    /**
     * Any course (published or not) with card data, ignoring the tenant scope.
     *
     * @return Builder<Course>
     */
    public function courses(): Builder
    {
        return Course::withoutGlobalScopes()
            ->whereNull('courses.deleted_at')
            ->with(['teacher:id,name', 'tenant:id,name,slug,type'])
            ->withCount(['accesses', 'lectures', 'reviews'])
            ->withSum('lectures', 'duration_seconds')
            ->withAvg('reviews', 'rating');
    }

    /**
     * @return array<string, mixed>
     */
    public function card(Course $course): array
    {
        return [
            'id' => $course->id,
            'slug' => $course->slug,
            'title' => $course->title,
            'subtitle' => $course->subtitle,
            'category' => $course->category,
            'level' => $course->level,
            'language' => $course->language,
            'price_cents' => $course->price_cents,
            'currency' => $course->currency,
            'instructor' => $course->teacher ? ['id' => $course->teacher->id, 'name' => $course->teacher->name] : null,
            'organization' => $course->tenant ? ['name' => $course->tenant->name, 'slug' => $course->tenant->slug, 'type' => $course->tenant->type] : null,
            'rating' => $course->reviews_avg_rating === null ? null : round((float) $course->reviews_avg_rating, 1),
            'reviews_count' => (int) $course->reviews_count,
            'students_count' => (int) $course->accesses_count,
            'lectures_count' => (int) $course->lectures_count,
            'duration_seconds' => (int) $course->lectures_sum_duration_seconds,
            'published_at' => $course->marketplace_published_at,
        ];
    }

    /**
     * Sections and lectures. Media fields are only included for people who
     * may watch; everyone else sees titles, lengths and which are previews.
     *
     * @param  list<string>  $completed  lecture ids the viewer finished
     * @return list<array<string, mixed>>
     */
    public function curriculum(Course $course, array $completed = [], bool $withMedia = false): array
    {
        $course->loadMissing(['sections' => fn ($q) => $q->withoutGlobalScopes()->with(['lectures' => fn ($q) => $q->withoutGlobalScopes()])]);

        return $course->sections->map(fn ($section) => [
            'id' => $section->id,
            'title' => $section->title,
            'lectures' => $section->lectures->map(fn (Lecture $lecture) => [
                'id' => $lecture->id,
                'title' => $lecture->title,
                'type' => $lecture->type,
                'duration_seconds' => $lecture->duration_seconds,
                'is_preview' => $lecture->is_preview,
                'completed' => in_array($lecture->id, $completed, true),
                ...($withMedia ? ['video_url' => $lecture->video_url, 'has_file' => $lecture->path !== null, 'body' => $lecture->body] : []),
            ])->values()->all(),
        ])->values()->all();
    }

    /**
     * Learners with access, plus the course's own workspace staff and enrolled
     * students (a school's class can use the same recorded course).
     */
    public function canWatch(?User $user, Course $course): bool
    {
        if (! $user) {
            return false;
        }

        if (CourseAccess::where('user_id', $user->id)->where('course_id', $course->id)->exists()) {
            return true;
        }

        $membership = Membership::withoutGlobalScopes()->where('tenant_id', $course->tenant_id)->where('user_id', $user->id)->first();
        if ($membership?->role->isStaff()) {
            return true;
        }

        return $membership?->role === Role::Student
            && Enrollment::withoutGlobalScopes()->where('course_id', $course->id)->where('student_id', $user->id)->exists();
    }

    public function owns(?User $user, Course $course): bool
    {
        return $user !== null && CourseAccess::where('user_id', $user->id)->where('course_id', $course->id)->exists();
    }

    public function grant(User $user, Course $course, string $source, ?Order $order = null): CourseAccess
    {
        return CourseAccess::firstOrCreate(
            ['user_id' => $user->id, 'course_id' => $course->id],
            ['tenant_id' => $course->tenant_id, 'source' => $source, 'order_id' => $order?->id],
        );
    }

    /**
     * @return list<string>
     */
    public function completedLectureIds(User $user, Course $course): array
    {
        return LectureProgress::where('user_id', $user->id)->where('course_id', $course->id)->whereNotNull('completed_at')->pluck('lecture_id')->all();
    }

    /**
     * Progress per course for the given courses, as [course_id => [done, total]].
     *
     * @param  Collection<int, string>  $courseIds
     * @return array<string, array{done: int, total: int}>
     */
    /**
     * Issues the learner's certificate once every lecture is done (and keeps
     * the one already issued if they later untick a lecture).
     *
     * @param  array{done: int, total: int}  $progress
     */
    public function certify(User $user, Course $course, array $progress): ?Certificate
    {
        $existing = Certificate::where('user_id', $user->id)->where('course_id', $course->id)->first();
        if ($existing || $progress['total'] === 0 || $progress['done'] < $progress['total']) {
            return $existing;
        }
        $course->loadMissing(['teacher:id,name', 'tenant:id,name']);

        return Certificate::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'recipient_name' => $user->name,
            'course_title' => $course->title,
            'instructor_name' => $course->teacher?->name,
            'organization_name' => $course->tenant?->name,
            'duration_seconds' => (int) Lecture::withoutGlobalScopes()->where('course_id', $course->id)->sum('duration_seconds'),
            'issued_at' => now(),
        ]);
    }

    public function progressFor(User $user, Collection $courseIds): array
    {
        $totals = Lecture::withoutGlobalScopes()->whereIn('course_id', $courseIds)->selectRaw('course_id, count(*) as n')->groupBy('course_id')->pluck('n', 'course_id');
        $done = LectureProgress::where('user_id', $user->id)->whereIn('course_id', $courseIds)->whereNotNull('completed_at')->selectRaw('course_id, count(*) as n')->groupBy('course_id')->pluck('n', 'course_id');

        return $courseIds->mapWithKeys(fn (string $id) => [$id => ['done' => (int) ($done[$id] ?? 0), 'total' => (int) ($totals[$id] ?? 0)]])->all();
    }
}
