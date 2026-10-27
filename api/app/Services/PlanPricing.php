<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Subscription;
use Illuminate\Http\Request;

/**
 * What a plan costs in a given country, and what a subscription costs with its
 * extra seats and add-ons. Countries without their own price use the plan's
 * default price (shown converted into the visitor's currency by the web apps).
 */
class PlanPricing
{
    /** Yearly billing charges ten months for seats and add-ons, like the plans themselves. */
    public const int YEARLY_MONTHS = 10;

    /**
     * The visitor's country: X-Country from the web apps (from the hosting
     * provider's geo header), or ?country=.
     */
    public function countryFrom(Request $request): ?string
    {
        $country = strtoupper((string) ($request->header('X-Country') ?: $request->query('country')));

        return preg_match('/^[A-Z]{2}$/', $country) ? $country : null;
    }

    /**
     * @return array{country: string|null, currency: string, price_monthly_cents: int, price_yearly_cents: int, extra_student_cents: int, extra_staff_cents: int, video_addon_cents: int|null}
     */
    public function priceFor(Plan $plan, ?string $country): array
    {
        $local = $this->localPrice($plan, $country);
        $source = $local ?? $plan;

        $price = ['country' => $local?->country];
        foreach (PlanPrice::PRICE_FIELDS as $field) {
            $price[$field] = $source->{$field};
        }

        return $price;
    }

    /**
     * What the plan includes in this country: its own allowance unless the country sets one.
     *
     * @return array{max_students: int|null, max_staff: int|null, storage_gb: int}
     */
    public function capacityFor(Plan $plan, ?string $country): array
    {
        $local = $this->localPrice($plan, $country);

        $capacity = [];
        foreach (PlanPrice::CAPACITY_FIELDS as $field) {
            $capacity[$field] = $local?->{$field} ?? $plan->{$field};
        }

        return $capacity;
    }

    /**
     * The plan as shown to a visitor from this country: translated, in the
     * local price, with what it includes there.
     *
     * @return array<string, mixed>
     */
    public function present(Plan $plan, ?string $country): array
    {
        $price = $this->priceFor($plan, $country);
        $presented = [...$plan->localized(), ...$price, ...$this->capacityFor($plan, $country), 'price_country' => $price['country']];
        unset($presented['country'], $presented['prices']);

        return $presented;
    }

    /**
     * Price per billing interval for a plan with extra seats and add-ons.
     *
     * @return array{currency: string, interval: string, amount_cents: int, country: string|null}
     */
    public function quote(Plan $plan, ?string $country, string $interval, int $extraStudents = 0, int $extraStaff = 0, bool $videoAddon = false): array
    {
        $price = $this->priceFor($plan, $country);
        $yearly = $interval === 'yearly';

        $monthlyExtras = $extraStudents * $price['extra_student_cents']
            + $extraStaff * $price['extra_staff_cents']
            + ($videoAddon ? (int) $price['video_addon_cents'] : 0);

        return [
            'currency' => $price['currency'],
            'interval' => $yearly ? 'yearly' : 'monthly',
            'amount_cents' => ($yearly ? $price['price_yearly_cents'] : $price['price_monthly_cents'])
                + $monthlyExtras * ($yearly ? self::YEARLY_MONTHS : 1),
            'country' => $price['country'],
        ];
    }

    private function localPrice(Plan $plan, ?string $country): ?PlanPrice
    {
        if ($country === null) {
            return null;
        }

        return $plan->relationLoaded('prices')
            ? $plan->prices->firstWhere('country', $country)
            : $plan->prices()->where('country', $country)->first();
    }

    /**
     * Fixes the subscription's price from its plan, seats, add-ons and the workspace's country.
     */
    public function price(Subscription $subscription, ?string $country): void
    {
        $quote = $this->quote(
            $subscription->plan,
            $country,
            $subscription->interval ?? 'monthly',
            (int) $subscription->extra_students,
            (int) $subscription->extra_staff,
            (bool) $subscription->video_addon,
        );

        $subscription->forceFill([
            'country' => $country,
            'currency' => $quote['currency'],
            'amount_cents' => $quote['amount_cents'],
        ]);
    }
}
