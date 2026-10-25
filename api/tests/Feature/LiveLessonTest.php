<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Events\LiveLessonUpdated;
use App\Jobs\DownloadZoomRecording;
use App\Models\Attendance;
use App\Models\LessonRecording;
use App\Models\LiveLesson;
use App\Models\Tenant;
use App\Notifications\LessonNotification;
use App\Notifications\RecordingAvailable;
use App\Services\LiveLessons;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LiveLessonTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        Event::fake([LiveLessonUpdated::class]);
        $this->tenant = Tenant::factory()->create();
    }

    private function useZoom(): void
    {
        config([
            'services.video.provider' => 'zoom',
            'services.zoom.account_id' => 'acct',
            'services.zoom.webhook_secret' => 'whsec',
        ]);
        Cache::put('zoom.access_token', 'zoom-token', now()->addMinutes(5));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    private function zoomHeaders(array $payload): array
    {
        $timestamp = (string) time();

        return [
            'x-zm-request-timestamp' => $timestamp,
            'x-zm-signature' => 'v0='.hash_hmac('sha256', "v0:{$timestamp}:".json_encode($payload), 'whsec'),
        ];
    }

    public function test_full_cycle_schedule_join_start_end_takes_attendance(): void
    {
        $teacher = $this->member($this->tenant, Role::Teacher);
        $course = $this->courseWithStudents($this->tenant, 2);
        [$alice, $bob] = $course->students()->orderBy('users.id')->get()->all();
        $startsAt = now()->addHour()->startOfMinute();

        // Schedule (Jitsi, since Zoom isn't configured).
        $id = $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", [
            'title' => 'Derivatives', 'scheduled_at' => $startsAt->toIso8601String(), 'duration_minutes' => 45,
        ])->assertCreated()->assertJsonPath('provider', 'jitsi')->assertJsonMissingPath('host_url')->json('id');
        Notification::assertSentTo($alice, LessonNotification::class, fn ($n) => $n->kind === 'scheduled');

        // Too early to join.
        $this->asMember($alice, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertUnprocessable();

        // Students see it on their dashboard.
        $this->asMember($alice, $this->tenant, 'GET', '/api/v1/live-lessons/upcoming')->assertOk()->assertJsonPath('0.id', $id);

        // Reminder 15 minutes before, sent once.
        $this->travelTo($startsAt->copy()->subMinutes(12));
        $this->artisan('lessons:tick')->assertSuccessful();
        $this->artisan('lessons:tick')->assertSuccessful();
        Notification::assertSentToTimes($bob, LessonNotification::class, 2); // scheduled + starting_soon

        // The host starts it; students are told it's live.
        $this->travelTo($startsAt);
        $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/start")
            ->assertOk()->assertJsonPath('lesson.status', 'live')->assertJsonStructure(['host_url']);
        Notification::assertSentTo($alice, LessonNotification::class, fn ($n) => $n->kind === 'started');
        Event::assertDispatched(LiveLessonUpdated::class, fn ($e) => $e->lesson->status === 'live');

        // Alice joins (twice); Bob never does.
        $this->asMember($alice, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertOk()->assertJsonStructure(['join_url']);
        $this->asMember($alice, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertOk();
        $roster = collect($this->asMember($teacher, $this->tenant, 'GET', "/api/v1/live-lessons/{$id}/attendees")->assertOk()->json())->keyBy('id');
        $this->assertSame([true, 2], [$roster[$alice->id]['joined'], $roster[$alice->id]['join_count']]);
        $this->assertFalse($roster[$bob->id]['joined']);

        // Ending takes attendance for the course automatically.
        $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/end")->assertOk()->assertJsonPath('status', 'ended');
        $this->assertSame('present', Attendance::withoutGlobalScopes()->where('student_id', $alice->id)->value('status'));
        $this->assertSame('absent', Attendance::withoutGlobalScopes()->where('student_id', $bob->id)->value('status'));
        $this->asMember($alice, $this->tenant, 'POST', "/api/v1/live-lessons/{$id}/join")->assertUnprocessable();
    }

    public function test_students_cannot_schedule_and_outsiders_cannot_join(): void
    {
        $course = $this->courseWithStudents($this->tenant, 1);
        $student = $course->students()->first();
        $this->asMember($student, $this->tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", [
            'title' => 'x', 'scheduled_at' => now()->addHour()->toIso8601String(),
        ])->assertForbidden();

        $lesson = app(LiveLessons::class)->schedule($course, ['title' => 'Now', 'scheduled_at' => now()->toDateTimeString()], $this->member($this->tenant, Role::Teacher));
        $otherStudent = $this->member($this->tenant, Role::Student);
        $this->asMember($otherStudent, $this->tenant, 'POST', "/api/v1/live-lessons/{$lesson->id}/join")->assertNotFound();
    }

    public function test_canceling_notifies_students(): void
    {
        $teacher = $this->member($this->tenant, Role::Teacher);
        $course = $this->courseWithStudents($this->tenant, 1);
        $lesson = app(LiveLessons::class)->schedule($course, ['title' => 'Lab', 'scheduled_at' => now()->addDay()->toDateTimeString()], $teacher);

        $this->asMember($teacher, $this->tenant, 'DELETE', "/api/v1/live-lessons/{$lesson->id}")->assertNoContent();

        $this->assertSame('canceled', $lesson->fresh()->status);
        Notification::assertSentTo($course->students()->first(), LessonNotification::class, fn ($n) => $n->kind === 'canceled');
    }

    public function test_zoom_meeting_webhooks_and_cloud_recording(): void
    {
        $this->useZoom();
        Http::fake([
            'api.zoom.us/v2/users/me/meetings' => Http::response(['id' => 987654321, 'join_url' => 'https://zoom.us/j/987654321', 'start_url' => 'https://zoom.us/s/987654321?zak=secret', 'password' => 'abc123']),
            'zoom.us/rec/download/*' => Http::response('FAKE-MP4-BYTES'),
        ]);
        Storage::fake('local');
        $teacher = $this->member($this->tenant, Role::Teacher);
        $course = $this->courseWithStudents($this->tenant, 1);
        $student = $course->students()->first();

        $id = $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/courses/{$course->id}/live-lessons", [
            'title' => 'Thermodynamics', 'scheduled_at' => now()->addMinutes(5)->toIso8601String(),
        ])->assertCreated()->assertJsonPath('provider', 'zoom')->json('id');
        Http::assertSent(fn ($r) => str_contains($r->url(), '/users/me/meetings') && $r['settings']['auto_recording'] === 'cloud');
        $lesson = LiveLesson::withoutGlobalScopes()->find($id);
        $this->assertSame('https://zoom.us/s/987654321?zak=secret', $lesson->host_url);
        $this->assertNotSame('https://zoom.us/s/987654321?zak=secret', LiveLesson::withoutGlobalScopes()->toBase()->where('id', $id)->value('host_url'));

        // URL validation challenge.
        $this->postJson('/api/v1/webhooks/zoom', ['event' => 'endpoint.url_validation', 'payload' => ['plainToken' => 'tok']])
            ->assertOk()->assertJsonPath('encryptedToken', hash_hmac('sha256', 'tok', 'whsec'));

        // Bad signature is refused; a signed meeting.started makes the lesson live.
        $started = ['event' => 'meeting.started', 'payload' => ['object' => ['id' => '987654321']]];
        $this->postJson('/api/v1/webhooks/zoom', $started, ['x-zm-request-timestamp' => (string) time(), 'x-zm-signature' => 'v0=nope'])->assertUnauthorized();
        $this->postJson('/api/v1/webhooks/zoom', $started, $this->zoomHeaders($started))->assertOk();
        $this->assertSame('live', $lesson->fresh()->status);

        $ended = ['event' => 'meeting.ended', 'payload' => ['object' => ['id' => '987654321']]];
        $this->postJson('/api/v1/webhooks/zoom', $ended, $this->zoomHeaders($ended))->assertOk();
        $this->assertSame('ended', $lesson->fresh()->status);

        // Recording arrives: downloaded into our storage and published to the class.
        $recorded = ['event' => 'recording.completed', 'download_token' => 'dl-token', 'payload' => ['object' => ['id' => 987654321, 'recording_files' => [
            ['id' => 'file-1', 'file_type' => 'MP4', 'recording_type' => 'shared_screen_with_speaker_view', 'file_size' => 14, 'download_url' => 'https://zoom.us/rec/download/abc', 'recording_start' => '2026-10-25T10:00:00Z', 'recording_end' => '2026-10-25T10:45:00Z'],
            ['id' => 'file-2', 'file_type' => 'M4A', 'recording_type' => 'audio_only', 'download_url' => 'https://zoom.us/rec/download/audio'],
        ]]]];
        $this->postJson('/api/v1/webhooks/zoom', $recorded, $this->zoomHeaders($recorded))->assertOk();
        $this->postJson('/api/v1/webhooks/zoom', $recorded, $this->zoomHeaders($recorded))->assertOk(); // Zoom retries are harmless

        $recording = LessonRecording::withoutGlobalScopes()->sole();
        $this->assertSame('ready', $recording->status);
        $this->assertSame(2700, $recording->duration_seconds);
        Storage::disk('local')->assertExists($recording->path);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'rec/download/abc') && $r->hasHeader('Authorization', 'Bearer dl-token'));
        Notification::assertSentTo($student, RecordingAvailable::class);

        $this->asMember($student, $this->tenant, 'GET', "/api/v1/courses/{$course->id}/live-lessons")->assertJsonPath('0.recordings_count', 1);
        $this->asMember($student, $this->tenant, 'GET', "/api/v1/live-lessons/{$id}")
            ->assertOk()->assertJsonPath('status', 'ended')->assertJsonPath('recordings.0.title', 'Thermodynamics')->assertJsonMissingPath('host_url');
    }

    public function test_zoom_recording_download_is_queued(): void
    {
        $this->useZoom();
        Bus::fake([DownloadZoomRecording::class]);
        $course = $this->courseWithStudents($this->tenant, 1);
        LiveLesson::create(['tenant_id' => $this->tenant->id, 'course_id' => $course->id, 'title' => 'x', 'scheduled_at' => now(), 'provider' => 'zoom', 'provider_meeting_id' => '55']);

        app(LiveLessons::class)->receiveZoomRecording(['id' => 55, 'recording_files' => [['id' => 'f', 'file_type' => 'MP4', 'recording_type' => 'active_speaker', 'download_url' => 'https://zoom.us/rec/download/f']]], 'tok');

        Bus::assertDispatched(DownloadZoomRecording::class);
        $this->assertSame('processing', LessonRecording::withoutGlobalScopes()->value('status'));
    }

    public function test_uploaded_recording_streams_through_a_signed_url(): void
    {
        Storage::fake('local');
        $teacher = $this->member($this->tenant, Role::Teacher);
        $course = $this->courseWithStudents($this->tenant, 1);
        $student = $course->students()->first();

        $id = $this->asMember($teacher, $this->tenant, 'POST', "/api/v1/courses/{$course->id}/recordings", [
            'title' => 'Week 1 lecture',
            'file' => UploadedFile::fake()->create('week1.mp4', 512, 'video/mp4'),
        ])->assertCreated()->assertJsonPath('status', 'ready')->assertJsonMissingPath('path')->json('id');
        Notification::assertSentTo($student, RecordingAvailable::class);

        $url = $this->asMember($student, $this->tenant, 'POST', "/api/v1/recordings/{$id}/play")->assertOk()->json('url');
        $this->get($url)->assertOk();
        $this->get(strtok($url, '?'))->assertForbidden(); // unsigned
        $this->assertSame(1, LessonRecording::withoutGlobalScopes()->find($id)->view_count);

        // Unpublished recordings disappear for students but not for staff.
        $this->asMember($teacher, $this->tenant, 'PATCH', "/api/v1/recordings/{$id}", ['published' => false])->assertOk();
        $this->asMember($student, $this->tenant, 'GET', "/api/v1/courses/{$course->id}/recordings")->assertJsonCount(0);
        $this->asMember($teacher, $this->tenant, 'GET', "/api/v1/courses/{$course->id}/recordings")->assertJsonCount(1);
        $this->asMember($student, $this->tenant, 'POST', "/api/v1/recordings/{$id}/play")->assertNotFound();
    }
}
