<?php

namespace App\Services\Video;

use App\Models\LiveLesson;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Zoom Meetings via a Server-to-Server OAuth app.
 *
 * Needs the scopes meeting:write:admin and recording:read:admin, and an event
 * subscription for meeting.started, meeting.ended and recording.completed pointing
 * at POST /api/webhooks/zoom.
 */
class ZoomProvider implements VideoProvider
{
    private const string API = 'https://api.zoom.us/v2';

    public function name(): string
    {
        return 'zoom';
    }

    public function recordsInCloud(): bool
    {
        return true;
    }

    public function createMeeting(LiveLesson $lesson): MeetingDetails
    {
        $meeting = $this->client()->post('/users/me/meetings', [
            ...$this->meetingFields($lesson),
            'type' => 2, // scheduled
            'settings' => [
                'join_before_host' => false,
                'waiting_room' => true,
                'mute_upon_entry' => true,
                'participant_video' => false,
                'host_video' => true,
                'auto_recording' => $lesson->auto_record ? 'cloud' : 'none',
                'meeting_authentication' => false,
            ],
        ])->throw()->json();

        return new MeetingDetails(
            meetingId: (string) $meeting['id'],
            joinUrl: $meeting['join_url'],
            hostUrl: $meeting['start_url'],
            passcode: $meeting['password'] ?? null,
        );
    }

    public function updateMeeting(LiveLesson $lesson): void
    {
        $this->client()->patch("/meetings/{$lesson->provider_meeting_id}", [
            ...$this->meetingFields($lesson),
            'settings' => ['auto_recording' => $lesson->auto_record ? 'cloud' : 'none'],
        ])->throw();
    }

    public function deleteMeeting(LiveLesson $lesson): void
    {
        $response = $this->client()->delete("/meetings/{$lesson->provider_meeting_id}");
        if ($response->failed() && $response->status() !== 404) {
            $response->throw();
        }
    }

    public function endMeeting(LiveLesson $lesson): void
    {
        // Zoom answers 400/404 if the meeting isn't running; that's fine.
        $this->client()->put("/meetings/{$lesson->provider_meeting_id}/status", ['action' => 'end']);
    }

    /**
     * Verifies the x-zm-signature header (HMAC-SHA256 of "v0:{timestamp}:{body}").
     */
    public function verifyWebhook(Request $request): bool
    {
        $secret = (string) config('services.zoom.webhook_secret');
        $timestamp = (string) $request->header('x-zm-request-timestamp');
        if ($secret === '' || $timestamp === '' || abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = 'v0='.hash_hmac('sha256', "v0:{$timestamp}:{$request->getContent()}", $secret);

        return hash_equals($expected, (string) $request->header('x-zm-signature'));
    }

    /**
     * Answer to Zoom's endpoint.url_validation challenge.
     *
     * @return array{plainToken: string, encryptedToken: string}
     */
    public function validationResponse(string $plainToken): array
    {
        return [
            'plainToken' => $plainToken,
            'encryptedToken' => hash_hmac('sha256', $plainToken, (string) config('services.zoom.webhook_secret')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function meetingFields(LiveLesson $lesson): array
    {
        return [
            'topic' => str($lesson->course->title.' — '.$lesson->title)->limit(195)->toString(),
            'agenda' => (string) str($lesson->description)->limit(1900),
            'start_time' => $lesson->scheduled_at->utc()->format('Y-m-d\TH:i:s\Z'),
            'timezone' => 'UTC',
            'duration' => $lesson->duration_minutes,
        ];
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(self::API)->withToken($this->accessToken())->acceptJson()->timeout(15)->retry(2, 500, throw: false);
    }

    private function accessToken(): string
    {
        return Cache::remember('zoom.access_token', now()->addMinutes(50), function (): string {
            $accountId = config('services.zoom.account_id');
            if (! $accountId) {
                throw new RuntimeException('Zoom is not configured (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET).');
            }

            return Http::withBasicAuth(config('services.zoom.client_id'), config('services.zoom.client_secret'))
                ->asForm()
                ->post('https://zoom.us/oauth/token', ['grant_type' => 'account_credentials', 'account_id' => $accountId])
                ->throw()
                ->json('access_token');
        });
    }
}
