<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\Material;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaterialController extends TenantController
{
    /**
     * @return Collection<int, Material>
     */
    public function index(Course $course): Collection
    {
        Gate::authorize('materials.view');
        $this->ensureCanSeeCourse($course);

        return $course->materials()
            ->when(! $this->membership()->role->isStaff(), fn ($q) => $q->whereNotNull('published_at')->where('published_at', '<=', now()))
            ->latest()
            ->get();
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        Gate::authorize('materials.write');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'file' => ['required_without:url', 'file', 'max:51200', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,csv,png,jpg,jpeg,mp4,mp3,zip'],
            'url' => ['required_without:file', 'nullable', 'url:https'],
            'published_at' => ['nullable', 'date'],
        ]);

        $attributes = [
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'url' => $data['url'] ?? null,
            'published_at' => $data['published_at'] ?? now(),
            'uploaded_by' => $request->user()->id,
        ];

        if ($file = $request->file('file')) {
            $disk = config('filesystems.materials_disk', 'local');
            $attributes += [
                'disk' => $disk,
                'path' => $file->store("tenants/{$this->tenant()->id}/materials", $disk),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
            ];
        }

        return response()->json($course->materials()->create($attributes), 201);
    }

    public function download(Material $material): StreamedResponse|JsonResponse
    {
        Gate::authorize('materials.view');
        $this->ensureCanSeeCourse($material->course);

        if (! $material->path) {
            return response()->json(['url' => $material->url]);
        }

        $extension = pathinfo($material->path, PATHINFO_EXTENSION);

        return Storage::disk($material->disk)->download($material->path, str($material->title)->slug().'.'.$extension);
    }

    public function destroy(Material $material): JsonResponse
    {
        Gate::authorize('materials.write');

        $material->delete();

        return response()->json(null, 204);
    }
}
