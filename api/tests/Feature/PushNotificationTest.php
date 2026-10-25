<?php

namespace Tests\Feature;

use App\Models\PushToken;
use App\Models\User;
use App\Notifications\SystemAlert;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class PushNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function configureFcm(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'fcm');
        file_put_contents($path, json_encode(['client_email' => 'push@educloud-test.iam.gserviceaccount.com', 'token_uri' => 'https://oauth2.googleapis.com/token']));
        config(['services.fcm.project_id' => 'educloud-test', 'services.fcm.credentials' => $path]);
        // Skip the service-account JWT exchange; the client reuses a cached access token.
        Cache::put('fcm.access_token', 'ya29.test', now()->addMinutes(5));
    }

    public function test_devices_register_push_tokens(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/me/push-tokens', ['token' => 'device-token-1', 'platform' => 'android'])->assertNoContent();
        $this->postJson('/api/v1/me/push-tokens', ['token' => 'device-token-1', 'platform' => 'android'])->assertNoContent();

        $this->assertSame(1, $user->pushTokens()->count());
    }

    public function test_alerts_are_pushed_through_fcm_and_dead_tokens_are_removed(): void
    {
        $this->configureFcm();
        Http::fake([
            'fcm.googleapis.com/*' => Http::sequence()
                ->push(['name' => 'projects/educloud-test/messages/1'])
                ->push(['error' => ['message' => 'Requested entity was not found.', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404),
        ]);
        $user = User::factory()->create();
        PushToken::create(['user_id' => $user->id, 'token' => 'live-token', 'platform' => 'ios']);
        PushToken::create(['user_id' => $user->id, 'token' => 'dead-token', 'platform' => 'android']);

        $user->notify(new SystemAlert('Queue stalled', 'Jobs are not being processed.'));

        Http::assertSent(fn ($request) => str_contains($request->url(), 'messages:send')
            && $request->hasHeader('Authorization', 'Bearer ya29.test')
            && $request['message']['notification']['title'] === 'Queue stalled');
        $this->assertSame(['live-token'], $user->pushTokens()->pluck('token')->all());
    }

    public function test_failed_jobs_alert_platform_staff_once_per_window(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['is_platform_admin' => true]);
        $job = Mockery::mock(Job::class);
        $job->shouldReceive('resolveName')->andReturn('App\\Jobs\\SendReport');

        event(new JobFailed('database', $job, new RuntimeException('SMTP timeout')));
        event(new JobFailed('database', $job, new RuntimeException('SMTP timeout')));

        Notification::assertSentToTimes($admin, SystemAlert::class, 1);
    }
}
