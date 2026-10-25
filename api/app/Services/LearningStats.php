<?php

namespace App\Services;

use App\Models\LearningDay;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Daily learning time, streaks and the weekly goal. Time comes from the
 * player's position pings (seconds actually played) and finished lectures.
 */
class LearningStats
{
    /** Credit for finishing a lecture without video time (e.g. an article). */
    private const COMPLETION_SECONDS = 60;

    /** Longest gap between two pings still counted as watching. */
    private const MAX_PING_SECONDS = 60;

    public function recordWatching(User $user, int $fromSeconds, int $toSeconds): void
    {
        $played = $toSeconds - $fromSeconds;
        if ($played > 0 && $played <= self::MAX_PING_SECONDS) {
            $this->today($user)->increment('seconds', $played);
        }
    }

    public function recordCompletion(User $user): void
    {
        $day = $this->today($user);
        $day->increment('lectures_completed');
        $day->increment('seconds', self::COMPLETION_SECONDS);
    }

    /**
     * @return array{streak: int, today_seconds: int, week_seconds: int, weekly_goal_minutes: int, week: list<array{day: string, seconds: int}>}
     */
    public function summary(User $user): array
    {
        $today = Carbon::today();
        $days = LearningDay::where('user_id', $user->id)
            ->where('day', '>=', $today->copy()->subDays(365))
            ->where('seconds', '>', 0)
            ->pluck('seconds', 'day')
            ->mapWithKeys(fn (int $seconds, string $day) => [Carbon::parse($day)->toDateString() => $seconds]);

        // A streak survives until the end of today: count back from today, or
        // from yesterday if nothing has been done yet today.
        $streak = 0;
        $cursor = $days->has($today->toDateString()) ? $today->copy() : $today->copy()->subDay();
        while ($days->has($cursor->toDateString())) {
            $streak++;
            $cursor->subDay();
        }

        $weekStart = $today->copy()->startOfWeek();
        $week = collect(range(0, 6))->map(function (int $offset) use ($weekStart, $days) {
            $day = $weekStart->copy()->addDays($offset)->toDateString();

            return ['day' => $day, 'seconds' => (int) ($days[$day] ?? 0)];
        });

        return [
            'streak' => $streak,
            'today_seconds' => (int) ($days[$today->toDateString()] ?? 0),
            'week_seconds' => (int) $week->sum('seconds'),
            'weekly_goal_minutes' => (int) ($user->weekly_goal_minutes ?? 60),
            'week' => $week->all(),
        ];
    }

    private function today(User $user): LearningDay
    {
        return LearningDay::firstOrCreate(['user_id' => $user->id, 'day' => Carbon::today()->toDateString()]);
    }
}
