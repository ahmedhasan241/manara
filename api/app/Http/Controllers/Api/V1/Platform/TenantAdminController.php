<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\PlanPricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

/**
 * Manara staff: every subscriber workspace and its subscription.
 */
class TenantAdminController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        return Tenant::query()
            ->with('subscription.plan:id,code,name')
            ->withCount('memberships')
            ->when($request->query('search'), fn ($q, $search) => $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('slug', 'like', "%{$search}%")))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'tenant' => $tenant->load('subscriptions.plan'),
            'counts' => $tenant->memberships()->withoutGlobalScopes()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role'),
        ]);
    }

    /**
     * People in one workspace, by role.
     */
    public function members(Request $request, Tenant $tenant): LengthAwarePaginator
    {
        return $tenant->memberships()
            ->withoutGlobalScopes()
            ->with('user:id,name,email,last_login_at,suspended_at')
            ->when($request->query('role'), fn ($q, $role) => $q->where('role', $role))
            ->when($request->query('search'), fn ($q, $s) => $q->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->orderBy('role')
            ->paginate(50);
    }

    public function update(Request $request, Tenant $tenant): Tenant
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
            'name' => ['sometimes', 'string', 'max:150'],
            'custom_domain' => ['nullable', 'string', 'max:190', Rule::unique('tenants')->ignore($tenant)],
        ]);

        $tenant->update($data);
        ActivityLog::record('platform.tenant.updated', $tenant, $tenant->getChanges());

        return $tenant;
    }

    /**
     * Moves a workspace to another plan (manual billing or support override).
     */
    public function changePlan(Request $request, Tenant $tenant, PlanPricing $pricing): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
            'status' => ['required', Rule::in(['trialing', 'active', 'past_due', 'canceled'])],
            'interval' => ['sometimes', Rule::in(['monthly', 'yearly'])],
            'extra_students' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'extra_staff' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'video_addon' => ['sometimes', 'boolean'],
            'current_period_ends_at' => ['nullable', 'date'],
        ]);

        // Seats and add-ons carry over from the current subscription unless changed.
        $previous = $tenant->subscription;
        $subscription = $tenant->subscriptions()->make([
            'extra_students' => $previous->extra_students ?? 0,
            'extra_staff' => $previous->extra_staff ?? 0,
            'video_addon' => $previous->video_addon ?? false,
            ...$data,
        ]);
        $pricing->price($subscription->setRelation('plan', Plan::findOrFail($data['plan_id'])), $tenant->country);
        $subscription->save();
        ActivityLog::record('platform.subscription.changed', $tenant, $data);

        return response()->json($subscription->load('plan'), 201);
    }
}
