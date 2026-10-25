<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Grade;
use App\Support\Countries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The signed-in user's own account: profile, sessions, security activity, data export.
 */
class MeController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->merge(Countries::normalize($request->only('country')));
        $user->update($request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'locale' => ['sometimes', Rule::in(['en', 'ar', 'fr', 'es', 'pt', 'zh'])],
            'phone' => ['nullable', 'string', 'max:40'],
            'headline' => ['nullable', 'string', 'max:160'],
            'bio' => ['nullable', 'string', 'max:2000'],
            ...Countries::locationRules(),
        ]));

        return response()->json(['message' => __('Profile updated.'), 'user' => new UserResource($user->fresh()->load('memberships.tenant'))]);
    }

    /**
     * Changes the password. Other devices are signed out; this one stays signed in.
     */
    public function password(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)->letters()->numbers()],
        ]);

        $user->update(['password' => $request->string('password')->toString()]);
        $current = $user->currentAccessToken();
        $user->tokens()->when($current instanceof PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->getKey()))->delete();
        ActivityLog::record('password.changed', $user, [], $user);

        return response()->json(['message' => __('Password changed. Other devices have been signed out.')]);
    }

    public function activity(Request $request): LengthAwarePaginator
    {
        return ActivityLog::withoutGlobalScopes()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate(30, ['id', 'action', 'subject_type', 'ip_address', 'user_agent', 'created_at']);
    }

    public function devices(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        return response()->json($request->user()->tokens()->latest('last_used_at')->get(['id', 'name', 'last_used_at', 'created_at'])
            ->map(fn ($token) => [...$token->toArray(), 'current' => $token->id === $currentId]));
    }

    public function revokeDevice(Request $request, int $token): JsonResponse
    {
        $request->user()->tokens()->whereKey($token)->delete();

        return response()->json(null, 204);
    }

    /**
     * GDPR right of access: every record we hold about the user, as JSON.
     */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user()->load('memberships.tenant:id,name,slug');

        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'profile' => $user->only(['id', 'name', 'email', 'locale', 'phone', 'created_at']),
            'memberships' => $user->memberships->map(fn ($m) => ['tenant' => $m->tenant->name, 'role' => $m->role->value]),
            'grades' => Grade::withoutGlobalScopes()->where('student_id', $user->id)->get(['assessment_id', 'score', 'feedback', 'updated_at']),
            'attendance' => Attendance::withoutGlobalScopes()->where('student_id', $user->id)->get(['class_session_id', 'status', 'note', 'updated_at']),
            'activity' => ActivityLog::withoutGlobalScopes()->where('user_id', $user->id)->latest('created_at')->limit(1000)->get(['action', 'ip_address', 'created_at']),
        ], 200, ['Content-Disposition' => 'attachment; filename="my-data.json"']);
    }
}
