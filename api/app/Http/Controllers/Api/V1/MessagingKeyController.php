<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\UserKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in user's messaging key pair and its passphrase-encrypted backup.
 */
class MessagingKeyController extends Controller
{
    private const string BASE64 = 'regex:/^[A-Za-z0-9+\/_-]+={0,2}$/';

    public function show(Request $request): JsonResponse
    {
        $key = $request->user()->messagingKey()->first();

        return response()->json(['data' => $key?->only([
            'public_key', 'encrypted_private_key', 'private_key_nonce', 'kdf_salt', 'kdf_ops_limit', 'kdf_mem_limit', 'version', 'updated_at',
        ])]);
    }

    /**
     * Creates the key pair, or re-wraps the same private key under a new passphrase.
     * Replacing the public key needs `reset: true`, because messages sealed to the
     * old key can no longer be read.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'public_key' => ['required', 'string', 'max:64', self::BASE64],
            'encrypted_private_key' => ['required', 'string', 'max:512', self::BASE64],
            'private_key_nonce' => ['required', 'string', 'max:64', self::BASE64],
            'kdf_salt' => ['required', 'string', 'max:64', self::BASE64],
            'kdf_ops_limit' => ['required', 'integer', 'min:2', 'max:20'],
            'kdf_mem_limit' => ['required', 'integer', 'min:67108864', 'max:1073741824'],
            'reset' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $existing = $user->messagingKey()->first();
        $replacesPublicKey = $existing && $existing->public_key !== $data['public_key'];

        if ($replacesPublicKey && ! ($data['reset'] ?? false)) {
            throw ValidationException::withMessages(['public_key' => __('A different key already exists. Restore it with your passphrase, or reset to start over.')]);
        }

        $key = UserKey::updateOrCreate(['user_id' => $user->id], [
            ...collect($data)->except('reset')->all(),
            'version' => $replacesPublicKey ? $existing->version + 1 : ($existing->version ?? 1),
        ]);

        ActivityLog::record($replacesPublicKey ? 'messaging.key_reset' : ($existing ? 'messaging.passphrase_changed' : 'messaging.key_created'), $user);

        return response()->json(['data' => $key->only(['public_key', 'version'])], $existing ? 200 : 201);
    }
}
