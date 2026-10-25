<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lecture;
use App\Models\LectureNote;
use App\Services\LearningStats;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Private notes learners take while watching, plus their learning stats
 * (streak, time this week, weekly goal).
 */
class LectureNoteController extends Controller
{
    public function __construct(private Marketplace $marketplace) {}

    /** The learner's notes for a course, in curriculum order then time. */
    public function index(Request $request, string $slug): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->where('slug', $slug)->firstOrFail();

        return response()->json(
            LectureNote::where('user_id', $request->user()->id)->where('course_id', $course->id)
                ->with('lecture:id,title,position')
                ->orderBy('position_seconds')
                ->get()
                ->sortBy(fn (LectureNote $n) => [$n->lecture?->position ?? 0, $n->position_seconds ?? 0])
                ->values()
        );
    }

    public function store(Request $request, Lecture $lecture): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->findOrFail($lecture->course_id);
        abort_unless($this->marketplace->canWatch($request->user(), $course), 403);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'position_seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        $note = LectureNote::create([...$data, 'user_id' => $request->user()->id, 'course_id' => $course->id, 'lecture_id' => $lecture->id]);

        return response()->json($note->load('lecture:id,title,position'), 201);
    }

    public function update(Request $request, LectureNote $note): JsonResponse
    {
        abort_unless($note->user_id === $request->user()->id, 404);
        $note->update($request->validate(['body' => ['required', 'string', 'max:2000']]));

        return response()->json($note->load('lecture:id,title,position'));
    }

    public function destroy(Request $request, LectureNote $note): JsonResponse
    {
        abort_unless($note->user_id === $request->user()->id, 404);
        $note->delete();

        return response()->json(['deleted' => true]);
    }

    public function stats(Request $request, LearningStats $stats): JsonResponse
    {
        return response()->json($stats->summary($request->user()));
    }

    public function goal(Request $request, LearningStats $stats): JsonResponse
    {
        $request->user()->update($request->validate(['weekly_goal_minutes' => ['required', 'integer', 'between:15,1200']]));

        return response()->json($stats->summary($request->user()->fresh()));
    }
}
