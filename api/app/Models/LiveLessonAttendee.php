<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['live_lesson_id', 'user_id', 'first_joined_at', 'last_joined_at', 'join_count'])]
class LiveLessonAttendee extends Model
{
    protected function casts(): array
    {
        return [
            'first_joined_at' => 'datetime',
            'last_joined_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<LiveLesson, $this>
     */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LiveLesson::class, 'live_lesson_id');
    }
}
