<?php

namespace App\Services;

use App\Models\Tenant;

/**
 * The share of a course sale Manara keeps. It depends on the seller's package
 * and country (bigger packages pay less), and is fixed on each sale when the
 * order is placed. Sellers without an active package pay the default rate.
 */
class Commission
{
    public function __construct(private PlanPricing $pricing) {}

    public function default(): int
    {
        return (int) config('services.payments.platform_fee_percent');
    }

    public function forSeller(Tenant $seller): int
    {
        $subscription = $seller->subscription()->with('plan.prices')->first();
        if ($subscription === null || ! $subscription->isUsable()) {
            return $this->default();
        }

        return $this->pricing->commissionFor($subscription->plan, $subscription->country ?? $seller->country);
    }
}
