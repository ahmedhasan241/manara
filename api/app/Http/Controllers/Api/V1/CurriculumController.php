<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Lecture;
use App\Services\Currencies;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The course builder for teachers, lecturers and institutions: marketplace
 * settings, sections and lectures, and publishing.
 */
class CurriculumController extends TenantController
{
    public function __construct(private Marketplace $marketplace) {}

    public function show(Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        return response()->json([
            'settings' => $this->settings($course),
            'curriculum' => $this->marketplace->curriculum($course, withMedia: true),
            'students' => $course->accesses()->count(),
        ]);
    }

    /**
     * Price, landing-page text and publishing. Publishing needs a slug and at
     * least one lecture.
     */
    public function updateSettings(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');

        $data = $request->validate([
            'is_public' => ['sometimes', 'boolean'],
            'slug' => ['sometimes', 'nullable', 'alpha_dash:ascii', 'min:3', 'max:120', Rule::unique('courses', 'slug')->ignore($course->id)],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:60'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'level' => ['sometimes', Rule::in(['beginner', 'intermediate', 'advanced', 'all'])],
            'language' => ['sometimes', 'string', 'max:10'],
            'price_cents' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'currency' => ['sometimes', Rule::in(app(Currencies::class)->codes())],
            'outcomes' => ['sometimes', 'array', 'max:12'],
            'outcomes.*' => ['string', 'max:200'],
            'requirements' => ['sometimes', 'array', 'max:12'],
            'requirements.*' => ['string', 'max:200'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $course->fill(collect($data)->except('publish')->all());
        if (($data['is_public'] ?? $course->is_public) && ! $course->slug) {
            $course->slug = $this->uniqueSlug($course->title);
        }

        if (array_key_exists('publish', $data)) {
            abort_if($course->marketplace_status === 'suspended', 422, __('Manara has paused this course. Contact support.'));
            if ($data['publish']) {
                $errors = array_filter([
                    'is_public' => $course->is_public ? null : 'Make the course public first.',
                    'lectures' => $course->lectures()->exists() ? null : 'Add at least one lecture before publishing.',
                ]);
                if ($errors !== []) {
                    throw ValidationException::withMessages($errors);
                }
                $course->marketplace_status = 'published';
                $course->marketplace_published_at ??= now();
            } else {
                $course->marketplace_status = 'draft';
            }
        }
        $course->save();

        return response()->json($this->settings($course));
    }

    public function storeSection(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('courses.manage');
        $data = $request->validate(['title' => ['required', 'string', 'max:190']]);

        $section = $course->sections()->create([...$data, 'position' => (int) $course->sections()->max('position') + 1]);

        return response()->json($section, 201);
    }

    public function updateSection(Request $request, CourseSection $section): JsonResponse
    {
        Gate::authorize('courses.manage');
        $section->update($request->validate(['title' => ['required', 'string', 'max:190']]));

        return response()->json($section);
    }

    public function destroySection(CourseSection $section): JsonResponse
    {
        Gate::authorize('courses.manage');
        $section->lectures()->each(fn (Lecture $lecture) => $this->deleteLecture($lecture));
        $section->delete();

        return response()->json(null, 204);
    }

    /**
     * Adds a lecture: an uploaded video, a video link, or a written article.
     */
    public function storeLecture(Request $request, CourseSection $section): JsonResponse
    {
        Gate::authorize('courses.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'type' => ['required', Rule::in(Lecture::TYPES)],
            'file' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4', 'max:2097152'],
            'video_url' => ['nullable', 'url:https', 'max:500'],
            'body' => ['nullable', 'required_if:type,article', 'string', 'max:50000'],
            'duration_minutes' => ['nullable', 'numeric', 'min:0', 'max:1440'],
            'is_preview' => ['sometimes', 'boolean'],
        ]);
        if ($data['type'] === 'video' && ! $request->hasFile('file') && empty($data['video_url'])) {
            throw ValidationException::withMessages(['video_url' => __('Upload a video or paste a link to one.')]);
        }

        $lecture = new Lecture([
            'course_id' => $section->course_id,
            'section_id' => $section->id,
            'title' => $data['title'],
            'type' => $data['type'],
            'body' => $data['body'] ?? null,
            'video_url' => $data['video_url'] ?? null,
            'duration_seconds' => (int) round(($data['duration_minutes'] ?? 0) * 60),
            'is_preview' => $data['is_preview'] ?? false,
            'position' => (int) $section->lectures()->max('position') + 1,
        ]);
        if ($file = $request->file('file')) {
            $disk = config('services.video.recordings_disk');
            $lecture->fill([
                'disk' => $disk,
                'path' => $file->store("tenants/{$this->tenant()->id}/lectures", $disk),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ]);
        }
        $lecture->save();

        return response()->json($lecture, 201);
    }

    public function updateLecture(Request $request, Lecture $lecture): JsonResponse
    {
        Gate::authorize('courses.manage');

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'body' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'video_url' => ['sometimes', 'nullable', 'url:https', 'max:500'],
            'duration_minutes' => ['sometimes', 'numeric', 'min:0', 'max:1440'],
            'is_preview' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('duration_minutes', $data)) {
            $data['duration_seconds'] = (int) round($data['duration_minutes'] * 60);
            unset($data['duration_minutes']);
        }
        $lecture->update($data);

        return response()->json($lecture);
    }

    public function destroyLecture(Lecture $lecture): JsonResponse
    {
        Gate::authorize('courses.manage');
        $this->deleteLecture($lecture);

        return response()->json(null, 204);
    }

    /**
     * Moves a section or lecture one place up or down.
     */
    public function move(Request $request, string $kind, string $id): JsonResponse
    {
        Gate::authorize('courses.manage');
        $direction = $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]])['direction'];

        $item = $kind === 'sections' ? CourseSection::findOrFail($id) : Lecture::findOrFail($id);
        $siblings = $kind === 'sections'
            ? CourseSection::where('course_id', $item->course_id)->orderBy('position')->get()
            : Lecture::where('section_id', $item->section_id)->orderBy('position')->get();

        $index = $siblings->search(fn ($s) => $s->id === $item->id);
        $swap = $siblings->get($direction === 'up' ? $index - 1 : $index + 1);
        if ($swap) {
            $ordered = $siblings->values()->all();
            [$ordered[$index], $ordered[$siblings->search($swap)]] = [$swap, $item];
            foreach ($ordered as $position => $model) {
                $model->update(['position' => $position + 1]);
            }
        }

        return response()->json(null, 204);
    }

    private function deleteLecture(Lecture $lecture): void
    {
        if ($lecture->path) {
            Storage::disk($lecture->disk)->delete($lecture->path);
        }
        $lecture->delete();
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'course';
        $slug = $base;
        for ($i = 2; Course::withoutGlobalScopes()->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    /**
     * @return array<string, mixed>
     */
    private function settings(Course $course): array
    {
        return $course->only([
            'id', 'title', 'is_public', 'marketplace_status', 'slug', 'subtitle', 'category', 'description',
            'level', 'language', 'price_cents', 'currency', 'outcomes', 'requirements', 'marketplace_published_at',
        ]);
    }
}
