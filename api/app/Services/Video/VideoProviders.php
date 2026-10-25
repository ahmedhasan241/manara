<?php

namespace App\Services\Video;

use InvalidArgumentException;

/**
 * Picks the video provider for new lessons and resolves the one an existing
 * lesson was created with.
 */
class VideoProviders
{
    public function __construct(private ZoomProvider $zoom, private JitsiProvider $jitsi) {}

    /**
     * Zoom when it is configured, otherwise Jitsi.
     */
    public function default(): VideoProvider
    {
        $preferred = config('services.video.provider') ?: (config('services.zoom.account_id') ? 'zoom' : 'jitsi');

        return $this->get($preferred);
    }

    public function get(string $name): VideoProvider
    {
        return match ($name) {
            'zoom' => $this->zoom,
            'jitsi' => $this->jitsi,
            default => throw new InvalidArgumentException("Unknown video provider [{$name}]."),
        };
    }
}
