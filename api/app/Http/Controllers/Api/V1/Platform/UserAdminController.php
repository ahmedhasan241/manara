<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Guardianship;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

/**
 * Manara staff: every person on the platform, across all workspaces.
 */
class UserAdminController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $request->validate([
            'role' => ['nullable', Rule::in([...array_column(Role::cases(), 'value'), 'platform'])],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
        ]);

        return User::query()
            ->with(['memberships' => fn ($q) => $q->withoutGlobalScopes()->with('tenant:id,name,slug')])
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->when($request->query('role') === 'platform', fn ($q) => $q->where('is_platform_admin', true))
            ->when($request->query('role') && $request->query('role') !== 'platform', fn ($q) => $q->whereHas('memberships', fn ($q) => $q->withoutGlobalScopes()->where('role', $request->query('role'))))
            ->when($request->query('tenant_id'), fn ($q, $t) => $q->whereHas('memberships', fn ($q) => $q->withoutGlobalScopes()->where('tenant_id', $t)))
            ->when($request->query('status') === 'suspended', fn ($q) => $q->whereNotNull('suspended_at'))
            ->when($request->query('status') === 'active', fn ($q) => $q->whereNull('suspended_at'))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100))
            ->through(fn (User $u) => $this->present($u));
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['memberships' => fn ($q) => $q->withoutGlobalScopes()->with('tenant:id,name,slug,type')]);

        return response()->json([
            ...$this->present($user),
            'devices' => $user->tokens()->count(),
            'children' => Guardianship::withoutGlobalScopes()->where('guardian_id', $user->id)->with('student:id,name')->get()->map(fn ($g) => ['id' => $g->student_id, 'name' => $g->student?->name, 'tenant_id' => $g->tenant_id]),
            'guardians' => Guardianship::withoutGlobalScopes()->where('student_id', $user->id)->with('guardian:id,name,email')->get()->map(fn ($g) => ['id' => $g->guardian_id, 'name' => $g->guardian?->name, 'email' => $g->guardian?->email]),
            'activity' => ActivityLog::withoutGlobalScopes()->where('user_id', $user->id)->latest('created_at')->limit(20)->get(['id', 'action', 'ip_address', 'created_at']),
        ]);
    }

    /**
     * Suspend or reactivate. Suspension signs the user out everywhere.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'suspended' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);
        abort_if($user->is($request->user()), 422, __('You cannot suspend your own account.'));

        if ($data['suspended']) {
            $user->forceFill(['suspended_at' => now(), 'suspension_reason' => $data['reason'] ?? null])->save();
            $user->tokens()->delete();
        } else {
            $user->forceFill(['suspended_at' => null, 'suspension_reason' => null])->save();
        }
        ActivityLog::record($data['suspended'] ? 'platform.user.suspended' : 'platform.user.reactivated', $user, ['reason' => $data['reason'] ?? null]);

        return response()->json($this->present($user->fresh()->load(['memberships' => fn ($q) => $q->withoutGlobalScopes()->with('tenant:id,name,slug')])));
    }

    /**
     * Turns off two-factor authentication for a user who lost their device.
     */
    public function resetMfa(User $user): JsonResponse
    {
        $user->forceFill(['mfa_secret' => null, 'mfa_recovery_codes' => null, 'mfa_enabled_at' => null])->save();
        ActivityLog::record('platform.user.mfa_reset', $user);

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'country' => $user->country,
            'city' => $user->city,
            'area' => $user->area,
            'is_platform_admin' => $user->is_platform_admin,
            'mfa_enabled' => $user->hasMfaEnabled(),
            'suspended_at' => $user->suspended_at,
            'suspension_reason' => $user->suspension_reason,
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'memberships' => $user->memberships->map(fn (Membership $m) => [
                'role' => $m->role->value,
                'tenant' => $m->tenant?->only(['id', 'name', 'slug']),
            ]),
        ];
    }
}
