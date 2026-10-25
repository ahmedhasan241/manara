<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\WishlistItem;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Courses a learner saved for later. Only courses still on the marketplace
 * are listed; ones the learner has since got are dropped automatically.
 */
class WishlistController extends Controller
{
    public function __construct(private Marketplace $marketplace) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = WishlistItem::where('user_id', $user->id)->latest()->get();
        $courses = $this->marketplace->catalog()->whereIn('courses.id', $items->pluck('course_id'))->get()->keyBy('id');

        return response()->json($items
            ->filter(fn (WishlistItem $item) => $courses->has($item->course_id) && ! $this->marketplace->owns($user, $courses[$item->course_id]))
            ->map(fn (WishlistItem $item) => [...$this->marketplace->card($courses[$item->course_id]), 'saved_at' => $item->created_at])
            ->values());
    }

    /**
     * Ids only, so course cards can show a filled heart cheaply.
     */
    public function ids(Request $request): JsonResponse
    {
        return response()->json(WishlistItem::where('user_id', $request->user()->id)->pluck('course_id'));
    }

    public function store(Request $request, string $courseId): JsonResponse
    {
        $course = $this->marketplace->catalog()->findOrFail($courseId);
        WishlistItem::firstOrCreate(['user_id' => $request->user()->id, 'course_id' => $course->id]);

        return response()->json(['saved' => true], 201);
    }

    public function destroy(Request $request, string $courseId): JsonResponse
    {
        WishlistItem::where('user_id', $request->user()->id)->where('course_id', $courseId)->delete();

        return response()->json(['saved' => false]);
    }
}
