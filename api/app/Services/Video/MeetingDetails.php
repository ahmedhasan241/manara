<?php

namespace App\Services\Video;

/**
 * What a provider returns for a newly created meeting.
 */
final readonly class MeetingDetails
{
    public function __construct(
        public string $meetingId,
        public string $joinUrl,
        public string $hostUrl,
        public ?string $passcode = null,
    ) {}
}
