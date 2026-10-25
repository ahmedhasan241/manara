<?php

namespace App\Services;

use App\Events\LiveLessonUpdated;
use App\Jobs\DownloadZoomRecording;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\LessonRecording;
use App\Models\LiveLesson;
use App\Models\User;
use App\Notifications\LessonNotification;
use App\Notifications\RecordingAvailable;
use App\Services\Video\VideoProviders;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * The whole online-lesson cycle:
 * schedule → remind → start (live) → students join → end (attendance taken)
 * → recording arrives (Zoom) or is uploaded → students are notified and can watch.
 */
class LiveLessons
{
    public function __construct(private VideoProviders $providers) {}

    /**
     * @param  array{title: string, description?: string|null, scheduled_at: string, duration_minutes?: int, auto_record?: bool}  $data
     */
    public function schedule(Course $course, array $data, User $host): LiveLesson
    {
        $provider = $this->providers->default();

        $lesson = new LiveLesson([
            'duration_minutes' => 60,
            'auto_record' => true,
            ...$data,
            'tenant_id' => $course->tenant_id,
            'course_id' => $course->id,
            'host_id' => $host->id,
            'provider' => $provider->name(),
            'status' => 'scheduled',
        ]);
        $lesson->setRelation('course', $course);

        $meeting = $provider->createMeeting($lesson);
        $lesson->fill([
            'provider_meeting_id' => $meeting->meetingId,
            'join_url' => $meeting->joinUrl,
            'host_url' => $meeting->hostUrl,
            'passcode' => $meeting->passcode,
        ])->save();

        $this->notifyStudents($lesson, 'scheduled');

        return $lesson;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function reschedule(LiveLesson $lesson, array $data): LiveLesson
    {
        abort_unless($lesson->status === 'scheduled', 422, __('Only lessons that have not started can be changed.'));

        $lesson->fill($data);
        $timeChanged = $lesson->isDirty(['scheduled_at', 'duration_minutes']);
        if ($timeChanged) {
            $lesson->reminder_sent_at = null;
        }
        $lesson->save();
        $this->providers->get($lesson->provider)->updateMeeting($lesson);

        if ($timeChanged) {
            $this->notifyStudents($lesson, 'rescheduled');
        }
        $this->broadcast($lesson);

        return $lesson;
    }

    public function cancel(LiveLesson $lesson): void
    {
        abort_if($lesson->status === 'ended', 422, __('This lesson has already ended.'));

        $this->providers->get($lesson->provider)->deleteMeeting($lesson);
        $lesson->update(['status' => 'canceled']);
        $this->notifyStudents($lesson, 'canceled');
        $this->broadcast($lesson);
    }

    /**
     * Marks the lesson live and tells students they can join. Safe to call more than
     * once (host button and provider webhook may both arrive).
     */
    public function markStarted(LiveLesson $lesson): void
    {
        if ($lesson->status !== 'scheduled') {
            return;
        }

        $lesson->update(['status' => 'live', 'started_at' => now()]);
        $this->notifyStudents($lesson, 'started');
        $this->broadcast($lesson);
    }

    /**
     * Ends the lesson and takes attendance: students who joined on time are
     * present, those who first joined after the school's grace period are late,
     * everyone else enrolled is absent (and their parents are told).
     * Teachers can correct it on the attendance tab.
     */
    public function markEnded(LiveLesson $lesson): void
    {
        if (! in_array($lesson->status, ['scheduled', 'live'], true)) {
            return;
        }

        $absences = collect();
        $lateAfter = AcademicStanding::settings($lesson->course->tenant)['late_after_minutes'];

        DB::transaction(function () use ($lesson, $lateAfter, &$absences): void {
            $lesson->update(['status' => 'ended', 'ended_at' => now(), 'started_at' => $lesson->started_at ?? now()]);

            $session = ClassSession::create([
                'tenant_id' => $lesson->tenant_id,
                'course_id' => $lesson->course_id,
                'starts_at' => $lesson->started_at,
                'ends_at' => $lesson->ended_at,
                'topic' => "Live: {$lesson->title}",
            ]);
            $joined = $lesson->attendees()->pluck('first_joined_at', 'user_id');
            $lateFrom = $lesson->started_at->copy()->addMinutes($lateAfter);
            foreach ($lesson->course->enrollments()->pluck('student_id') as $studentId) {
                $joinedAt = isset($joined[$studentId]) ? Carbon::parse($joined[$studentId]) : null;
                $status = match (true) {
                    $joinedAt === null => 'absent',
                    $joinedAt->greaterThan($lateFrom) => 'late',
                    default => 'present',
                };
                $attendance = Attendance::create([
                    'tenant_id' => $lesson->tenant_id,
                    'class_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => $status,
                    'note' => match ($status) {
                        'present' => 'Joined the live lesson',
                        'late' => 'Joined '.(int) $lesson->started_at->diffInMinutes($joinedAt).' min after the start',
                        default => null,
                    },
                    'recorded_by' => $lesson->host_id,
                ]);
                if ($status === 'absent') {
                    $absences->push($attendance);
                }
            }
        });

        $absences->each(fn (Attendance $attendance) => AcademicRecords::notifyGuardians($attendance));
        $this->broadcast($lesson);
    }

    /**
     * Records that a user opened the join link and returns where to send them.
     *
     * @return array{join_url: string, passcode: string|null}
     */
    public function join(LiveLesson $lesson, User $user): array
    {
        abort_unless($lesson->isJoinable(), 422, $lesson->status === 'scheduled'
            ? 'This lesson opens '.LiveLesson::EARLY_JOIN_MINUTES.' minutes before it starts.'
            : 'This lesson is not running.');

        $attendee = $lesson->attendees()->firstOrNew(['user_id' => $user->id]);
        $attendee->first_joined_at ??= now();
        $attendee->last_joined_at = now();
        $attendee->join_count = $attendee->exists ? $attendee->join_count + 1 : 1;
        $attendee->save();

        return ['join_url' => $lesson->join_url, 'passcode' => $lesson->passcode];
    }

    /**
     * Zoom's recording.completed webhook: one recording per video file, downloaded
     * into our storage in the background.
     *
     * @param  array<string, mixed>  $object
     */
    public function receiveZoomRecording(array $object, string $downloadToken): void
    {
        $lesson = LiveLesson::withoutGlobalScopes()
            ->where('provider', 'zoom')
            ->where('provider_meeting_id', (string) Arr::get($object, 'id'))
            ->first();
        if (! $lesson) {
            return;
        }

        $videos = collect(Arr::get($object, 'recording_files', []))
            ->where('file_type', 'MP4')
            ->sortByDesc(fn (array $f) => $f['recording_type'] === 'shared_screen_with_speaker_view')
            ->values();

        foreach ($videos as $index => $file) {
            $recording = LessonRecording::withoutGlobalScopes()->firstOrCreate(['provider_file_id' => $file['id']], [
                'tenant_id' => $lesson->tenant_id,
                'course_id' => $lesson->course_id,
                'live_lesson_id' => $lesson->id,
                'title' => $lesson->title.($index > 0 ? ' (part '.($index + 1).')' : ''),
                'source' => 'zoom',
                'status' => 'processing',
                'mime_type' => 'video/mp4',
                'size_bytes' => (int) ($file['file_size'] ?? 0),
                'duration_seconds' => isset($file['recording_start'], $file['recording_end'])
                    ? max(0, strtotime($file['recording_end']) - strtotime($file['recording_start']))
                    : null,
            ]);

            if ($recording->wasRecentlyCreated) {
                DownloadZoomRecording::dispatch($recording, $file['download_url'], $downloadToken);
            }
        }
    }

    /**
     * Publishes a ready recording and tells the class.
     */
    public function publishRecording(LessonRecording $recording): void
    {
        $recording->update(['status' => 'ready', 'published_at' => $recording->published_at ?? now()]);

        Notification::send($this->students($recording->course), new RecordingAvailable($recording));
    }

    /**
     * Sends "starting soon" reminders for lessons beginning in the next 15 minutes.
     */
    public function sendReminders(): int
    {
        $due = LiveLesson::withoutGlobalScopes()
            ->with('course')
            ->where('status', 'scheduled')
            ->whereNull('reminder_sent_at')
            ->whereBetween('scheduled_at', [now(), now()->addMinutes(15)])
            ->get();

        foreach ($due as $lesson) {
            $lesson->update(['reminder_sent_at' => now()]);
            $this->notifyStudents($lesson, 'starting_soon');
        }

        return $due->count();
    }

    /**
     * Ends lessons left running well past their slot (e.g. the host closed the tab).
     */
    public function closeAbandoned(): int
    {
        $stale = LiveLesson::withoutGlobalScopes()
            ->with('course')
            ->where('status', 'live')
            ->get()
            ->filter(fn (LiveLesson $l) => $l->endsAt()->addHours(2)->isPast());

        $stale->each(fn (LiveLesson $l) => $this->markEnded($l));

        return $stale->count();
    }

    /**
     * Enrolled students plus their parents.
     *
     * @return Collection<int, User>
     */
    private function students(Course $course): Collection
    {
        $studentIds = $course->enrollments()->withoutGlobalScopes()->pluck('student_id');
        $parentIds = DB::table('guardianships')
            ->where('tenant_id', $course->tenant_id)
            ->whereIn('student_id', $studentIds)
            ->pluck('guardian_id');

        return User::whereIn('id', $studentIds->merge($parentIds)->unique())->get();
    }

    private function notifyStudents(LiveLesson $lesson, string $kind): void
    {
        Notification::send($this->students($lesson->course), new LessonNotification($lesson, $kind));
    }

    private function broadcast(LiveLesson $lesson): void
    {
        $audience = $lesson->course->enrollments()->withoutGlobalScopes()->pluck('student_id')
            ->push($lesson->host_id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        LiveLessonUpdated::dispatch($lesson, $audience);
    }
}
