<?php

namespace App\Notifications;

use App\Models\LessonRecording;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class RecordingAvailable extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public LessonRecording $recording) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', FcmChannel::class];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => 'recordings',
            'tenant_id' => $this->recording->tenant_id,
            'title' => __('Recording available'),
            'body' => "{$this->recording->course->title}: {$this->recording->title}",
            'course_id' => $this->recording->course_id,
            'recording_id' => $this->recording->id,
        ];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return [
            'title' => $data['title'],
            'body' => $data['body'],
            'data' => ['type' => 'recording', 'recording_id' => $this->recording->id, 'course_id' => $this->recording->course_id],
        ];
    }
}
