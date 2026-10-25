<?php

namespace App\Notifications;

use App\Models\LiveLesson;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells students (and parents) about a live lesson: scheduled, rescheduled,
 * starting soon, live now, or canceled.
 */
class LessonNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public LiveLesson $lesson, public string $kind) {}

    /**
     * Time-sensitive ones go to phones; the schedule itself is also emailed.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return match ($this->kind) {
            'starting_soon', 'started', 'canceled' => ['database', 'broadcast', FcmChannel::class],
            'scheduled', 'rescheduled' => ['database', 'broadcast', 'mail'],
            default => ['database'],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->toArray($notifiable);

        return (new MailMessage)
            ->subject($data['title'])
            ->line($data['body'])
            ->line(__('You can join from the course page in Manara up to :minutes minutes before it starts.', ['minutes' => LiveLesson::EARLY_JOIN_MINUTES]));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $course = $this->lesson->course->title;
        $when = $this->lesson->scheduled_at->locale(app()->getLocale())->isoFormat('llll').' (UTC)';
        $lesson = ['title' => $this->lesson->title, 'course' => $course, 'when' => $when];

        [$title, $body, $priority] = match ($this->kind) {
            'scheduled' => [__('New live lesson: :title', $lesson), "{$course} · {$when}", 'normal'],
            'rescheduled' => [__('Lesson moved: :title', $lesson), __(':course · now :when', $lesson), 'important'],
            'starting_soon' => [__('Starting soon: :title', $lesson), __(':course starts at :time UTC. Get ready to join.', [...$lesson, 'time' => $this->lesson->scheduled_at->format('H:i')]), 'important'],
            'started' => [__('Live now: :title', $lesson), __(':course has started. Tap to join.', $lesson), 'urgent'],
            'canceled' => [__('Canceled: :title', $lesson), __(':course on :when will not take place.', $lesson), 'important'],
            default => [$this->lesson->title, $course, 'normal'],
        };

        return [
            'category' => 'lessons',
            'kind' => $this->kind,
            'tenant_id' => $this->lesson->tenant_id,
            'title' => $title,
            'body' => $body,
            'priority' => $priority,
            'course_id' => $this->lesson->course_id,
            'lesson_id' => $this->lesson->id,
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
            'data' => ['type' => 'lesson', 'kind' => $this->kind, 'lesson_id' => $this->lesson->id, 'course_id' => $this->lesson->course_id],
        ];
    }
}
