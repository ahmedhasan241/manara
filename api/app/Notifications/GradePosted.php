<?php

namespace App\Notifications;

use App\Models\Grade;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class GradePosted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Grade $grade) {}

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
            'category' => 'grades',
            'tenant_id' => $this->grade->tenant_id,
            'title' => __('New grade posted'),
            'body' => sprintf('%s: %s', $this->grade->assessment->course->title, $this->grade->assessment->title),
            'course_id' => $this->grade->assessment->course_id,
            'assessment_id' => $this->grade->assessment_id,
        ];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        $data = $this->toArray($notifiable);

        return ['title' => $data['title'], 'body' => $data['body'], 'data' => ['type' => 'grade', 'course_id' => $data['course_id']]];
    }
}
