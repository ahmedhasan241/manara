<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ActivityLog;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\Entitlements;
use App\Services\PlanPricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The workspace's package: plan, seats, video meetings add-on and price, priced
 * for the workspace's country. Owners and admins change it here.
 */
class BillingController extends TenantController
{
    public function __construct(private PlanPricing $pricing, private Entitlements $entitlements) {}

    public function show(): JsonResponse
    {
        Gate::authorize('tenant.manage');

        return response()->json($this->summary($this->subscription()));
    }

    public function update(Request $request): JsonResponse
    {
        Gate::authorize('tenant.manage');
        $subscription = $this->subscription();

        $data = $request->validate([
            'plan' => ['sometimes', Rule::exists('plans', 'code')->where('is_active', true)],
            'interval' => ['sometimes', Rule::in(['monthly', 'yearly'])],
            'extra_students' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'extra_staff' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'video_addon' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['plan'])) {
            $subscription->setRelation('plan', Plan::where('code', $data['plan'])->firstOrFail());
            $subscription->plan_id = $subscription->plan->id;
        }
        $subscription->fill(collect($data)->except('plan')->all());

        $seats = $this->entitlements->seats($this->tenant());
        foreach (['students' => $subscription->studentSeats(), 'staff' => $subscription->staffSeats()] as $kind => $limit) {
            if ($limit !== null && $seats[$kind]['used'] > $limit) {
                throw ValidationException::withMessages([
                    $kind === 'students' ? 'extra_students' : 'extra_staff' => __('You already have :used :kind; the new package would allow :limit.', ['used' => $seats[$kind]['used'], 'kind' => __($kind), 'limit' => $limit]),
                ]);
            }
        }

        $this->pricing->price($subscription, $this->tenant()->country);
        $subscription->save();

        ActivityLog::record('billing.updated', $this->tenant(), $subscription->getChanges());

        return response()->json($this->summary($subscription->fresh('plan')));
    }

    private function subscription(): Subscription
    {
        $subscription = $this->tenant()->subscription()->with('plan')->first();
        abort_if($subscription === null, 404, __('This workspace has no package yet.'));

        return $subscription;
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Subscription $subscription): array
    {
        $tenant = $this->tenant();
        $country = $tenant->country;
        $seats = $this->entitlements->seats($tenant);
        $plans = Plan::with('prices')->where('is_active', true)->orderBy('sort_order')->get();

        return [
            'subscription' => $subscription->only(['id', 'status', 'interval', 'extra_students', 'extra_staff', 'video_addon', 'country', 'currency', 'amount_cents', 'trial_ends_at', 'current_period_ends_at']),
            'plan' => $this->pricing->present($subscription->plan->load('prices'), $country),
            'seats' => $seats,
            'video_meetings' => $subscription->hasVideoMeetings(),
            'plans' => $plans->map(fn (Plan $plan) => $this->pricing->present($plan, $country))->all(),
        ];
    }
}
