<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tells a parent that their child missed a lesson.
 */
class AbsenceRecorded extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Attendance $attendance) {}

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
        $session = $this->attendance->session;

        return [
            'category' => 'attendance',
            'tenant_id' => $this->attendance->tenant_id,
            'title' => __(':name was absent', ['name' => $this->attendance->student?->name]),
            'body' => sprintf('%s · %s', $session?->course?->title, $session?->starts_at?->toDayDateTimeString()),
            'course_id' => $session?->course_id,
            'student_id' => $this->attendance->student_id,
        ];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return ['title' => $data['title'], 'body' => $data['body'], 'data' => ['type' => 'attendance', 'course_id' => (string) $data['course_id']]];
    }
}
