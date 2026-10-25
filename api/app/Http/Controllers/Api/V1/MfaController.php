<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\Totp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MfaController extends Controller
{
    /**
     * Starts enrolment: stores a new secret and returns it for the authenticator app.
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasMfaEnabled()) {
            throw ValidationException::withMessages(['mfa' => __('Two-factor authentication is already enabled.')]);
        }

        $secret = Totp::generateSecret();
        $user->forceFill(['mfa_secret' => $secret, 'mfa_enabled_at' => null])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_uri' => Totp::provisioningUri($secret, $user->email, config('app.name')),
        ]);
    }

    /**
     * Confirms enrolment with a first code and returns one-time recovery codes.
     */
    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        if (! $user->mfa_secret || ! Totp::verify($user->mfa_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => __('The code is not valid.')]);
        }

        $recoveryCodes = collect(range(1, 8))->map(fn () => strtoupper(Str::random(5).'-'.Str::random(5)));

        $user->forceFill([
            'mfa_enabled_at' => now(),
            'mfa_recovery_codes' => $recoveryCodes->map(fn (string $code) => Hash::make($code))->all(),
        ])->save();

        ActivityLog::record('mfa.enabled', $user);

        return response()->json(['recovery_codes' => $recoveryCodes->all()]);
    }

    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'current_password'],
            'code' => ['required', 'string'],
        ]);
        $user = $request->user();

        if (! $user->hasMfaEnabled() || ! Totp::verify($user->mfa_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => __('The code is not valid.')]);
        }

        $user->forceFill(['mfa_secret' => null, 'mfa_recovery_codes' => null, 'mfa_enabled_at' => null])->save();
        ActivityLog::record('mfa.disabled', $user);

        return response()->json(['message' => __('Two-factor authentication disabled.')]);
    }
}
