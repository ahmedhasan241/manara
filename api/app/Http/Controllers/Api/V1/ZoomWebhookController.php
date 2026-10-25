<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LiveLesson;
use App\Services\LiveLessons;
use App\Services\Video\ZoomProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * Zoom event subscription: keeps lesson status in step with the real meeting and
 * collects cloud recordings when they're ready.
 */
class ZoomWebhookController extends Controller
{
    public function __invoke(Request $request, ZoomProvider $zoom, LiveLessons $lessons): JsonResponse
    {
        $event = (string) $request->input('event');

        // Zoom checks the endpoint before enabling the subscription.
        if ($event === 'endpoint.url_validation') {
            return response()->json($zoom->validationResponse((string) $request->input('payload.plainToken')));
        }

        abort_unless($zoom->verifyWebhook($request), 401, __('Invalid signature.'));

        $object = (array) $request->input('payload.object', []);

        if ($event === 'recording.completed') {
            $lessons->receiveZoomRecording($object, (string) $request->input('download_token'));

            return response()->json(['ok' => true]);
        }

        $lesson = LiveLesson::withoutGlobalScopes()
            ->with('course')
            ->where('provider', 'zoom')
            ->where('provider_meeting_id', (string) Arr::get($object, 'id'))
            ->first();

        if ($lesson && $event === 'meeting.started') {
            $lessons->markStarted($lesson);
        } elseif ($lesson && $event === 'meeting.ended') {
            $lessons->markEnded($lesson);
        }

        return response()->json(['ok' => true]);
    }
}
