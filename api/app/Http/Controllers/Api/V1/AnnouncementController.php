<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Announcement;
use App\Models\Course;
use App\Models\User;
use App\Notifications\AnnouncementPublished;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class AnnouncementController extends TenantController
{
    public function index(Request $request): LengthAwarePaginator
    {
        $membership = $this->membership();
        $visibleCourseIds = Course::query()->visibleTo($membership)->select('id');

        return Announcement::query()
            ->with('author:id,name', 'course:id,title')
            ->where(fn ($q) => $q->whereNull('course_id')->orWhereIn('course_id', $visibleCourseIds))
            ->when(! $membership->role->isStaff(), fn ($q) => $q->whereNotNull('published_at'))
            ->latest('published_at')
            ->paginate(20);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('announcements.write');

        $data = $request->validate([
            'course_id' => ['nullable', 'uuid', Rule::exists('courses', 'id')->where('tenant_id', $this->tenant()->id)],
            'title' => ['required', 'string', 'max:190'],
            'body' => ['required', 'string', 'max:20000'],
            'priority' => ['sometimes', Rule::in(['normal', 'important', 'urgent'])],
            'deadline_at' => ['nullable', 'date'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $announcement = Announcement::create([
            ...collect($data)->except('publish')->all(),
            'author_id' => $request->user()->id,
            'published_at' => ($data['publish'] ?? true) ? now() : null,
        ]);

        if ($announcement->published_at) {
            Notification::send($this->audience($announcement), new AnnouncementPublished($announcement));
        }

        return response()->json($announcement, 201);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        Gate::authorize('announcements.write');

        $announcement->delete();

        return response()->json(null, 204);
    }

    /**
     * Course announcements go to enrolled students; tenant-wide ones to every member.
     *
     * @return Collection<int, User>
     */
    private function audience(Announcement $announcement): Collection
    {
        if ($announcement->course_id) {
            return $announcement->course->students()->get();
        }

        return User::whereIn('id', $this->tenant()->memberships()->select('user_id'))
            ->whereKeyNot($announcement->author_id)
            ->get();
    }
}
