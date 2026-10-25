<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Models\Membership;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentTenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the tenant from the X-Tenant header (slug) or the request subdomain,
 * and checks the authenticated user is a member of it.
 */
class ResolveTenant
{
    public function __construct(private CurrentTenant $currentTenant) {}

    public function handle(Request $request, Closure $next, string $mode = 'member'): Response
    {
        $slug = $request->header('X-Tenant') ?? $this->slugFromHost($request->getHost());

        $tenant = $slug ? Tenant::where('slug', $slug)->first() : null;
        if (! $tenant) {
            return response()->json(['message' => __('Unknown tenant.')], 404);
        }

        if (! $tenant->isActive()) {
            return response()->json(['message' => __('This workspace is suspended.')], 423);
        }

        $membership = null;
        if ($mode === 'member') {
            $user = $request->user();
            $membership = $user
                ? Membership::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('user_id', $user->id)->first()
                : null;

            if (! $membership) {
                return response()->json(['message' => __('You are not a member of this workspace.')], 403);
            }

            if ($tenant->requiresMfa() && $membership->role->isStaff() && ! $user->hasMfaEnabled()) {
                return response()->json(['message' => __('This workspace requires two-factor authentication.'), 'code' => 'mfa_setup_required'], 403);
            }
        }

        // Parents pick which child they're looking at; default to the first one.
        $studentId = null;
        if ($membership?->role === Role::Parent) {
            $children = $membership->childIds();
            $requested = (int) $request->header('X-Student');
            $studentId = in_array($requested, $children, true) ? $requested : ($children[0] ?? null);
        }

        $this->currentTenant->set($tenant, $membership, $studentId);

        return $next($request);
    }

    private function slugFromHost(string $host): ?string
    {
        $root = config('app.tenant_root_domain');
        if ($root && str_ends_with($host, '.'.$root)) {
            return substr($host, 0, -strlen('.'.$root));
        }

        return null;
    }
}
