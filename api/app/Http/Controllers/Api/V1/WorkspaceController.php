<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ActivityLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;

/**
 * The subscriber's own workspace: settings, public website content, plan, audit log.
 */
class WorkspaceController extends TenantController
{
    public function show(): JsonResponse
    {
        $tenant = $this->tenant()->load('subscription.plan');

        return response()->json([
            'tenant' => $tenant,
            'role' => $this->membership()->role->value,
            'permissions' => $this->membership()->role->permissions(),
        ]);
    }

    public function update(Request $request): Tenant
    {
        Gate::authorize('tenant.manage');

        $tenant = $this->tenant();
        $tenant->update($request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'locale' => ['sometimes', 'string', 'max:10'],
            'timezone' => ['sometimes', 'timezone:all'],
            'country' => ['nullable', 'string', 'size:2'],
            'branding' => ['sometimes', 'array'],
            'branding.logo_url' => ['nullable', 'url'],
            'branding.primary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'site' => ['sometimes', 'array'],
            'site.tagline' => ['nullable', 'string', 'max:190'],
            'site.about' => ['nullable', 'string', 'max:10000'],
            'site.contact_email' => ['nullable', 'email'],
            'site.contact_phone' => ['nullable', 'string', 'max:40'],
            'site.address' => ['nullable', 'string', 'max:300'],
            'site.programs' => ['nullable', 'array', 'max:30'],
            'site.programs.*.title' => ['required', 'string', 'max:120'],
            'site.programs.*.description' => ['nullable', 'string', 'max:1000'],
            'settings' => ['sometimes', 'array'],
            'settings.require_mfa' => ['sometimes', 'boolean'],
            'settings.grading_scale' => ['sometimes', 'array'],
        ]));

        ActivityLog::record('workspace.updated', $tenant, $tenant->getChanges());

        return $tenant;
    }

    public function activity(Request $request): LengthAwarePaginator
    {
        Gate::authorize('activity.view');

        return ActivityLog::query()
            ->with('user:id,name')
            ->when($request->query('action'), fn ($q, $action) => $q->where('action', $action))
            ->latest('created_at')
            ->paginate(50);
    }
}
