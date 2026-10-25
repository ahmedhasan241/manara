<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Services\FcmClient;
use Illuminate\Notifications\Notification;

/**
 * Notification channel for mobile push. A notification opts in by returning
 * FcmChannel::class from via() and implementing toFcm().
 */
class FcmChannel
{
    public function __construct(private FcmClient $client) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User || ! $this->client->isConfigured() || ! method_exists($notification, 'toFcm')) {
            return;
        }

        /** @var array{title: string, body: string, data?: array<string, string>} $push */
        $push = $notification->toFcm($notifiable);

        foreach ($notifiable->pushTokens as $token) {
            $this->client->send($token, $push['title'], $push['body'], $push['data'] ?? []);
        }
    }
}
