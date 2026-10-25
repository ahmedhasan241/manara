<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * An online lesson or lecture.
 *
 * Lifecycle: scheduled → live → ended (recordings arrive after) or scheduled → canceled.
 */
#[Fillable(['tenant_id', 'course_id', 'host_id', 'title', 'description', 'unit', 'objectives', 'homework', 'homework_due_at', 'resources', 'summary', 'scheduled_at', 'duration_minutes', 'status', 'started_at', 'ended_at', 'auto_record', 'provider', 'provider_meeting_id', 'join_url', 'host_url', 'passcode', 'reminder_sent_at'])]
#[Hidden(['host_url', 'passcode', 'provider_meeting_id'])]
class LiveLesson extends Model
{
    use BelongsToTenant, HasUuids;

    /** Students may join this many minutes before the start time. */
    public const int EARLY_JOIN_MINUTES = 10;

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'homework_due_at' => 'datetime',
            'objectives' => 'array',
            'resources' => 'array',
            'auto_record' => 'boolean',
            'host_url' => 'encrypted',
            'passcode' => 'encrypted',
        ];
    }

    public function endsAt(): Carbon
    {
        return $this->scheduled_at->copy()->addMinutes($this->duration_minutes);
    }

    /**
     * Learners can join while the lesson is live, or shortly before it starts so
     * they're in the waiting room when the host arrives.
     */
    public function isJoinable(): bool
    {
        return match ($this->status) {
            'live' => true,
            'scheduled' => now()->between($this->scheduled_at->copy()->subMinutes(self::EARLY_JOIN_MINUTES), $this->endsAt()),
            default => false,
        };
    }

    /**
     * @param  Builder<LiveLesson>  $query
     */
    public function scopeUpcoming(Builder $query): void
    {
        $query->whereIn('status', ['scheduled', 'live'])->where('scheduled_at', '>=', now()->subHours(6));
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    /**
     * @return HasMany<LiveLessonAttendee, $this>
     */
    public function attendees(): HasMany
    {
        return $this->hasMany(LiveLessonAttendee::class);
    }

    /**
     * @return HasMany<LessonRecording, $this>
     */
    public function recordings(): HasMany
    {
        return $this->hasMany(LessonRecording::class);
    }
}
