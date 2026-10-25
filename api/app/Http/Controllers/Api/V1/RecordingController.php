<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\LessonRecording;
use App\Services\LiveLessons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

/**
 * Recordings on a course page. Videos are played through short-lived signed
 * URLs, so the browser's <video> tag can stream (with seeking) without a token.
 */
class RecordingController extends TenantController
{
    public function __construct(private LiveLessons $lessons) {}

    public function index(Course $course): JsonResponse
    {
        Gate::authorize('materials.view');
        $this->ensureCanSeeCourse($course);
        $isStaff = $this->membership()->role->isStaff();

        $recordings = LessonRecording::query()
            ->where('course_id', $course->id)
            ->when(! $isStaff, fn ($q) => $q->where('status', 'ready')->whereNotNull('published_at'))
            ->with('lesson:id,title,scheduled_at')
            ->latest()
            ->get();

        return response()->json($recordings);
    }

    /**
     * Teacher uploads a video, or links one (YouTube, Drive, Vimeo...).
     */
    public function store(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('materials.write');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'live_lesson_id' => ['nullable', 'uuid', Rule::exists('live_lessons', 'id')->where('course_id', $course->id)],
            'file' => ['required_without:url', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4', 'max:2097152'],
            'url' => ['required_without:file', 'nullable', 'url:https'],
            'duration_seconds' => ['nullable', 'integer', 'min:1'],
        ]);

        $recording = new LessonRecording([
            'course_id' => $course->id,
            'live_lesson_id' => $data['live_lesson_id'] ?? null,
            'title' => $data['title'],
            'duration_seconds' => $data['duration_seconds'] ?? null,
            'uploaded_by' => $request->user()->id,
            'status' => 'processing',
        ]);

        if ($file = $request->file('file')) {
            $disk = config('services.video.recordings_disk');
            $recording->fill([
                'source' => 'upload',
                'disk' => $disk,
                'path' => $file->store("tenants/{$this->tenant()->id}/recordings", $disk),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        } else {
            $recording->fill(['source' => 'link', 'external_url' => $data['url']]);
        }
        $recording->save();
        $this->lessons->publishRecording($recording);

        return response()->json($recording->fresh(), 201);
    }

    public function update(Request $request, LessonRecording $recording): LessonRecording
    {
        Gate::authorize('materials.write');

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'published' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('published', $data)) {
            $recording->published_at = $data['published'] ? ($recording->published_at ?? now()) : null;
        }
        $recording->fill(collect($data)->only('title')->all())->save();

        return $recording;
    }

    public function destroy(LessonRecording $recording): JsonResponse
    {
        Gate::authorize('materials.write');
        $recording->delete();

        return response()->json(null, 204);
    }

    /**
     * Returns where to play the recording and counts the view.
     */
    public function play(LessonRecording $recording): JsonResponse
    {
        Gate::authorize('materials.view');
        $this->ensureCanSeeCourse($recording->course);
        $isStaff = $this->membership()->role->isStaff();
        abort_unless($recording->isReady() && ($isStaff || $recording->published_at), 404);

        $recording->increment('view_count');

        return response()->json([
            'url' => $recording->external_url ?? URL::temporarySignedRoute('v1.recordings.stream', now()->addHours(4), ['recording' => $recording->id]),
            'external' => $recording->external_url !== null,
            'mime_type' => $recording->mime_type,
        ]);
    }

    /**
     * The signed stream itself. Local files support HTTP range requests (seeking);
     * on S3 we redirect to a temporary URL.
     */
    public function stream(string $recording): mixed
    {
        $recording = LessonRecording::withoutGlobalScopes()->whereNull('deleted_at')->findOrFail($recording);
        abort_unless($recording->path, 404);

        $disk = Storage::disk($recording->disk);
        if (config("filesystems.disks.{$recording->disk}.driver") === 's3') {
            return redirect()->away($disk->temporaryUrl($recording->path, now()->addHours(4)));
        }

        return response()->file($disk->path($recording->path), [
            'Content-Type' => $recording->mime_type ?? 'video/mp4',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
