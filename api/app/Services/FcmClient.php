<?php

namespace App\Services;

use App\Models\PushToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Sends push notifications through the Firebase Cloud Messaging HTTP v1 API.
 * Authenticates with a service account (OAuth 2.0 JWT bearer grant).
 */
class FcmClient
{
    private const string SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    public function isConfigured(): bool
    {
        return filled(config('services.fcm.project_id')) && filled(config('services.fcm.credentials'));
    }

    /**
     * @param  array<string, string>  $data
     */
    public function send(PushToken $token, string $title, string $body, array $data = []): void
    {
        $response = Http::withToken($this->accessToken())
            ->timeout(10)
            ->post(sprintf('https://fcm.googleapis.com/v1/projects/%s/messages:send', config('services.fcm.project_id')), [
                'message' => [
                    'token' => $token->token,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data' => array_map('strval', $data),
                    'android' => ['priority' => 'high'],
                    'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
                ],
            ]);

        // The app was uninstalled or the token rotated: stop sending to it.
        if ($response->status() === 404 || $response->json('error.details.0.errorCode') === 'UNREGISTERED') {
            $token->delete();

            return;
        }

        if ($response->failed()) {
            Log::warning('FCM send failed', ['status' => $response->status(), 'body' => $response->json('error.message')]);
        }
    }

    private function accessToken(): string
    {
        return Cache::remember('fcm.access_token', now()->addMinutes(50), function (): string {
            $credentials = json_decode((string) file_get_contents(config('services.fcm.credentials')), true);
            if (! is_array($credentials) || empty($credentials['private_key'])) {
                throw new RuntimeException('FCM_CREDENTIALS does not point to a valid service-account file.');
            }

            $now = time();
            $segments = [
                $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
                $this->base64Url(json_encode([
                    'iss' => $credentials['client_email'],
                    'scope' => self::SCOPE,
                    'aud' => $credentials['token_uri'],
                    'iat' => $now,
                    'exp' => $now + 3600,
                ])),
            ];
            openssl_sign(implode('.', $segments), $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256);
            $segments[] = $this->base64Url($signature);

            return Http::asForm()->post($credentials['token_uri'], [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => implode('.', $segments),
            ])->throw()->json('access_token');
        });
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
