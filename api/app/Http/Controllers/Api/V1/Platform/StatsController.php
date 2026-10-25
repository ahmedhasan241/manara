<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Membership;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Business and system health numbers for the platform admin dashboard.
 */
class StatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $current = Subscription::query()
            ->whereIn('id', Subscription::selectRaw('max(id)')->groupBy('tenant_id'))
            ->with('plan:id,price_monthly_cents,price_yearly_cents')
            ->get();

        $mrrCents = $current->where('status', 'active')->sum(fn (Subscription $s) => $s->interval === 'yearly'
            ? intdiv($s->plan->price_yearly_cents, 12)
            : $s->plan->price_monthly_cents);

        $signups = Tenant::query()
            ->where('created_at', '>=', now()->subDays(30)->startOfDay())
            ->get(['created_at'])
            ->countBy(fn (Tenant $t) => $t->created_at->toDateString());

        return response()->json([
            'tenants' => [
                'total' => Tenant::count(),
                'active' => Tenant::where('status', 'active')->count(),
                'by_type' => Tenant::selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type'),
            ],
            'subscriptions' => $current->countBy('status'),
            'mrr_cents' => $mrrCents,
            'users' => [
                'members' => Membership::withoutGlobalScopes()->count(),
                'by_role' => Membership::withoutGlobalScopes()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role'),
                'suspended' => User::whereNotNull('suspended_at')->count(),
                'active_last_7_days' => ActivityLog::withoutGlobalScopes()->where('action', 'login')->where('created_at', '>=', now()->subDays(7))->distinct('user_id')->count('user_id'),
            ],
            'signups_last_30_days' => $signups,
            'system' => [
                'failed_jobs' => DB::table('failed_jobs')->count(),
                'queued_jobs' => DB::table('jobs')->count(),
            ],
        ]);
    }
}
