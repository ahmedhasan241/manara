<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Membership;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Countries;
use App\Support\Totp;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const int MFA_CHALLENGE_SECONDS = 300;

    private const int TRIAL_DAYS = 14;

    /**
     * Sign-up from the marketing site: creates the workspace, its owner and a trial.
     */
    public function registerWorkspace(Request $request): JsonResponse
    {
        $request->merge(Countries::normalize($request->only('country')));
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', Password::min(10)->mixedCase()->numbers()],
            'workspace_name' => ['required', 'string', 'max:150'],
            'workspace_slug' => ['required', 'alpha_dash:ascii', 'min:3', 'max:40', 'unique:tenants,slug', Rule::notIn(['www', 'api', 'admin', 'app'])],
            'workspace_type' => ['required', Rule::in(Tenant::TYPES)],
            'plan' => ['nullable', 'exists:plans,code'],
            'device_name' => ['nullable', 'string', 'max:100'],
            ...Countries::locationRules(),
        ]);

        [$user, $tenant] = DB::transaction(function () use ($data): array {
            $user = User::create([
                'name' => $data['name'],
                'email' => strtolower($data['email']),
                'password' => $data['password'],
                ...Arr::only($data, ['country', 'city', 'area']),
            ]);

            $tenant = Tenant::create([
                'slug' => strtolower($data['workspace_slug']),
                'name' => $data['workspace_name'],
                'type' => $data['workspace_type'],
                'country' => $data['country'] ?? null,
            ]);

            Membership::create(['tenant_id' => $tenant->id, 'user_id' => $user->id, 'role' => Role::Owner]);

            $plan = Plan::where('code', $data['plan'] ?? null)->first()
                ?? Plan::where('is_active', true)->orderBy('sort_order')->firstOrFail();

            $tenant->subscriptions()->create([
                'plan_id' => $plan->id,
                'status' => 'trialing',
                'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
            ]);

            return [$user, $tenant];
        });

        ActivityLog::record('workspace.created', $tenant, [], $user);

        return response()->json([
            'token' => $this->issueToken($user, $data['device_name'] ?? 'web'),
            'user' => new UserResource($user->load('memberships.tenant')),
        ], 201);
    }

    /**
     * Emails a reset link. Always answers the same way so it can't be used to
     * find out who has an account.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        PasswordBroker::sendResetLink(['email' => strtolower($data['email'])]);

        return response()->json(['message' => __('If that email has an account, a reset link is on its way.')]);
    }

    /**
     * Sets a new password from an emailed link (also how invited people set
     * their first password) and signs them out everywhere else.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $status = PasswordBroker::reset(
            [...$data, 'email' => strtolower($data['email'])],
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            },
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return response()->json(['message' => __('Your password is set. You can sign in now.')]);
    }

    /**
     * Sign-up on the learning website: a personal account (no workspace) for
     * buying and taking courses.
     */
    public function registerLearner(Request $request): JsonResponse
    {
        $request->merge(Countries::normalize($request->only('country')));
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', Password::min(8)->letters()->numbers()],
            'device_name' => ['nullable', 'string', 'max:100'],
            ...Countries::locationRules(),
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            ...Arr::only($data, ['country', 'city', 'area']),
        ]);
        ActivityLog::record('learner.registered', $user, [], $user);

        return response()->json([
            'token' => $this->issueToken($user, $data['device_name'] ?? 'web'),
            'user' => new UserResource($user->load('memberships.tenant')),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if ($user->suspended_at) {
            throw ValidationException::withMessages(['email' => __('This account has been suspended. Contact your school or Manara support.')]);
        }

        if ($user->hasMfaEnabled()) {
            return response()->json([
                'mfa_required' => true,
                'challenge' => Crypt::encryptString(json_encode([
                    'uid' => $user->id,
                    'device' => $data['device_name'] ?? 'web',
                    'exp' => now()->addSeconds(self::MFA_CHALLENGE_SECONDS)->timestamp,
                ])),
            ]);
        }

        return $this->completeLogin($user, $data['device_name'] ?? 'web');
    }

    /**
     * Second step of login: a TOTP code or a one-time recovery code.
     */
    public function mfaChallenge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string'],
            'code' => ['required', 'string', 'max:32'],
        ]);

        try {
            $payload = json_decode(Crypt::decryptString($data['challenge']), true, flags: JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            throw ValidationException::withMessages(['challenge' => __('Invalid sign-in challenge.')]);
        }

        if (($payload['exp'] ?? 0) < now()->timestamp) {
            throw ValidationException::withMessages(['challenge' => __('The sign-in challenge expired. Please sign in again.')]);
        }

        $user = User::findOrFail($payload['uid']);

        if (! $this->consumeMfaCode($user, $data['code'])) {
            ActivityLog::record('login.mfa_failed', $user, [], $user);
            throw ValidationException::withMessages(['code' => __('The code is not valid.')]);
        }

        return $this->completeLogin($user, $payload['device'] ?? 'web');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => __('Signed out.')]);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('memberships.tenant'));
    }

    private function completeLogin(User $user, string $device): JsonResponse
    {
        $user->forceFill(['last_login_at' => now()])->save();
        ActivityLog::record('login', $user, ['device' => $device], $user);

        return response()->json([
            'token' => $this->issueToken($user, $device),
            'user' => new UserResource($user->load('memberships.tenant')),
        ]);
    }

    private function issueToken(User $user, string $device): string
    {
        return $user->createToken($device, ['*'], now()->addDays(30))->plainTextToken;
    }

    private function consumeMfaCode(User $user, string $code): bool
    {
        if (Totp::verify($user->mfa_secret, $code)) {
            return true;
        }

        $codes = $user->mfa_recovery_codes ?? [];
        $normalized = strtoupper(trim($code));
        foreach ($codes as $index => $hashed) {
            if (Hash::check($normalized, $hashed)) {
                unset($codes[$index]);
                $user->forceFill(['mfa_recovery_codes' => array_values($codes)])->save();

                return true;
            }
        }

        return false;
    }
}
