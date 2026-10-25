<?php

namespace App\Services\Video;

use App\Models\LiveLesson;

/**
 * A video meeting service that hosts live lessons.
 */
interface VideoProvider
{
    public function name(): string;

    /**
     * Creates the meeting for a scheduled lesson.
     */
    public function createMeeting(LiveLesson $lesson): MeetingDetails;

    /**
     * Pushes new title/time/duration to an existing meeting.
     */
    public function updateMeeting(LiveLesson $lesson): void;

    public function deleteMeeting(LiveLesson $lesson): void;

    /**
     * Ends the meeting for everyone, if the provider supports it.
     */
    public function endMeeting(LiveLesson $lesson): void;

    /**
     * Whether recordings arrive from the provider automatically (via webhooks).
     */
    public function recordsInCloud(): bool;
}
