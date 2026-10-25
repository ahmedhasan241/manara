<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

/**
 * Current subscription of every workspace: filter by status, extend trials,
 * cancel or reactivate.
 */
class SubscriptionAdminController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $request->validate(['status' => ['nullable', Rule::in(['trialing', 'active', 'past_due', 'canceled', 'trial_ending'])]]);

        return Subscription::query()
            ->whereIn('id', Subscription::selectRaw('max(id)')->groupBy('tenant_id'))
            ->with(['tenant:id,name,slug,type,status', 'plan:id,code,name,price_monthly_cents,price_yearly_cents,currency'])
            ->when($request->query('status') === 'trial_ending', fn ($q) => $q->where('status', 'trialing')->whereBetween('trial_ends_at', [now(), now()->addDays(7)]))
            ->when($request->query('status') && $request->query('status') !== 'trial_ending', fn ($q) => $q->where('status', $request->query('status')))
            ->when($request->query('plan_id'), fn ($q, $p) => $q->where('plan_id', $p))
            ->latest()
            ->paginate(min($request->integer('per_page', 25), 100));
    }

    public function update(Request $request, Subscription $subscription): Subscription
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['trialing', 'active', 'past_due', 'canceled'])],
            'trial_ends_at' => ['nullable', 'date'],
            'current_period_ends_at' => ['nullable', 'date'],
            'interval' => ['sometimes', Rule::in(['monthly', 'yearly'])],
        ]);

        if (($data['status'] ?? null) === 'canceled') {
            $data['canceled_at'] = now();
        } elseif (isset($data['status'])) {
            $data['canceled_at'] = null;
        }

        $subscription->update($data);
        ActivityLog::record('platform.subscription.updated', $subscription->tenant, $subscription->getChanges());

        return $subscription->load(['tenant:id,name,slug,type,status', 'plan:id,code,name,price_monthly_cents,price_yearly_cents,currency']);
    }
}
