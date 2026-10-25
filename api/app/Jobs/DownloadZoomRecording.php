<?php

namespace App\Jobs;

use App\Models\LessonRecording;
use App\Services\LiveLessons;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Copies a Zoom cloud recording into our own storage, so it stays available to
 * students after Zoom's retention period, then publishes it on the course page.
 */
class DownloadZoomRecording implements ShouldQueue
{
    use Queueable;

    public int $tries = 4;

    public int $timeout = 3600;

    /** @var list<int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public LessonRecording $recording, public string $downloadUrl, public string $downloadToken) {}

    public function handle(LiveLessons $lessons): void
    {
        $disk = config('services.video.recordings_disk');
        $path = "tenants/{$this->recording->tenant_id}/recordings/{$this->recording->id}.mp4";
        $temp = tempnam(sys_get_temp_dir(), 'rec');

        try {
            Http::withToken($this->downloadToken)
                ->timeout($this->timeout)
                ->withOptions(['sink' => $temp])
                ->get($this->downloadUrl)
                ->throw();

            $stream = fopen($temp, 'rb');
            Storage::disk($disk)->writeStream($path, $stream);
            is_resource($stream) && fclose($stream);

            $this->recording->forceFill([
                'disk' => $disk,
                'path' => $path,
                'size_bytes' => filesize($temp) ?: $this->recording->size_bytes,
            ])->save();
        } finally {
            @unlink($temp);
        }

        $lessons->publishRecording($this->recording);
    }

    public function failed(Throwable $exception): void
    {
        $this->recording->update(['status' => 'failed']);
    }
}
