<?php

namespace App\Events;

use App\Models\LiveLesson;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Pushes lesson status changes (live, ended, canceled, rescheduled) to everyone in
 * the course, so "Live now" banners and join buttons update without a reload.
 */
class LiveLessonUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  list<int>  $userIds
     */
    public function __construct(public LiveLesson $lesson, public array $userIds) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return array_map(fn (int $id) => new PrivateChannel("users.{$id}"), $this->userIds);
    }

    public function broadcastAs(): string
    {
        return 'lesson.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->lesson->id,
            'course_id' => $this->lesson->course_id,
            'title' => $this->lesson->title,
            'status' => $this->lesson->status,
            'scheduled_at' => $this->lesson->scheduled_at->toIso8601String(),
        ];
    }
}
