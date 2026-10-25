<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AnnouncementPublished extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Announcement $announcement) {}

    /**
     * Everyone sees it live in the app. Important announcements and deadlines also
     * go to phones; urgent ones are emailed too.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];
        if ($this->announcement->priority !== 'normal' || $this->announcement->deadline_at) {
            $channels[] = FcmChannel::class;
        }
        if ($this->announcement->priority === 'urgent') {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        return [
            'title' => $this->announcement->title,
            'body' => $this->announcement->deadline_at
                ? __('Due :date', ['date' => $this->announcement->deadline_at->locale(app()->getLocale())->isoFormat('llll')])
                : str($this->announcement->body)->limit(100)->toString(),
            'data' => ['type' => 'announcement', 'announcement_id' => $this->announcement->id],
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->announcement->title)
            ->line($this->announcement->body)
            ->when($this->announcement->deadline_at, fn (MailMessage $mail) => $mail->line(__('Deadline: :date', ['date' => $this->announcement->deadline_at->locale(app()->getLocale())->isoFormat('llll')])));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => 'announcements',
            'tenant_id' => $this->announcement->tenant_id,
            'title' => $this->announcement->title,
            'body' => str($this->announcement->body)->limit(160)->toString(),
            'priority' => $this->announcement->priority,
            'deadline_at' => $this->announcement->deadline_at?->toIso8601String(),
            'announcement_id' => $this->announcement->id,
        ];
    }
}
