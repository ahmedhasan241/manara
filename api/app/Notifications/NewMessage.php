<?php

namespace App\Notifications;

use App\Models\Message;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Push alert for a new message. The message body is end-to-end encrypted, so the
 * alert only says who wrote; the app decrypts the text when it opens.
 */
class NewMessage extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Message $message, public string $senderName, public ?string $conversationTitle = null) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    /**
     * @return array{title: string, body: string, data: array<string, string>}
     */
    public function toFcm(object $notifiable): array
    {
        return [
            'title' => $this->conversationTitle ?? $this->senderName,
            'body' => $this->conversationTitle ? __('New message from :name', ['name' => $this->senderName]) : __('New message'),
            'data' => [
                'type' => 'message',
                'conversation_id' => $this->message->conversation_id,
                'message_id' => $this->message->id,
            ],
        ];
    }
}
