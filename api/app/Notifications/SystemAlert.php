<?php

namespace App\Notifications;

use App\Notifications\Channels\FcmChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Critical system alert for Manara staff (failed jobs, anomalies).
 * Sent synchronously: the queue may be what is broken.
 */
class SystemAlert extends Notification
{
    public function __construct(public string $title, public string $body, public string $severity = 'critical') {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', 'mail', FcmChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->error()->subject("[Manara {$this->severity}] {$this->title}")->line($this->body);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return ['category' => 'system', 'severity' => $this->severity, 'title' => $this->title, 'body' => $this->body];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'data' => ['type' => 'system', 'severity' => $this->severity]];
    }
}
