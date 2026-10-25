<?php

namespace App\Services\Video;

use App\Models\LiveLesson;
use Illuminate\Support\Str;

/**
 * Jitsi Meet: free, no account needed (public meet.jit.si or a self-hosted server).
 * There is no meeting API, so the host starts and ends the lesson from Manara,
 * and recordings are uploaded by the teacher.
 */
class JitsiProvider implements VideoProvider
{
    public function name(): string
    {
        return 'jitsi';
    }

    public function recordsInCloud(): bool
    {
        return false;
    }

    public function createMeeting(LiveLesson $lesson): MeetingDetails
    {
        // Long random room names: anyone who guesses one can join.
        $room = 'Manara-'.Str::slug($lesson->course->code).'-'.Str::random(24);
        $url = rtrim((string) config('services.jitsi.domain', 'https://meet.jit.si'), '/').'/'.$room;

        return new MeetingDetails(meetingId: $room, joinUrl: $url, hostUrl: $url);
    }

    public function updateMeeting(LiveLesson $lesson): void {}

    public function deleteMeeting(LiveLesson $lesson): void {}

    public function endMeeting(LiveLesson $lesson): void {}
}
