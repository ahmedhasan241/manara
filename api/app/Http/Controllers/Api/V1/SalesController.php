<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\OrderItem;
use App\Services\Commission;
use App\Services\Currencies;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * A workspace's course sales: revenue, earnings after Manara's commission,
 * learners per course and recent purchases. Amounts are in the workspace's
 * currency; each sale keeps the commission it was ordered with.
 */
class SalesController extends TenantController
{
    public function __invoke(Commission $commission, Currencies $currencies): JsonResponse
    {
        Gate::authorize('courses.manage');
        $tenant = $this->tenant();
        $currency = $tenant->currency();

        $items = OrderItem::where('order_items.tenant_id', $tenant->id)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'paid')
            ->select('order_items.*', 'orders.paid_at', 'orders.user_id', 'orders.currency')
            ->orderByDesc('orders.paid_at')
            ->get()
            ->each(function (OrderItem $item) use ($currencies, $currency, $commission): void {
                $item->setAttribute('amount_cents', $currencies->convert($item->price_cents, $item->getAttribute('currency'), $currency));
                $item->setAttribute('earned_cents', (int) round($item->amount_cents * (100 - ($item->commission_percent ?? $commission->default())) / 100));
            });
        $revenue = (int) $items->sum('amount_cents');

        $courses = Course::where('is_public', true)->withCount('accesses')->orderBy('title')->get();

        return response()->json([
            'currency' => $currency,
            'revenue_cents' => $revenue,
            // The commission on new sales, from the workspace's current package.
            'platform_fee_percent' => $commission->forSeller($tenant),
            'earnings_cents' => (int) $items->sum('earned_cents'),
            'sales' => $items->count(),
            'learners' => CourseAccess::where('tenant_id', $tenant->id)->distinct('user_id')->count('user_id'),
            'courses' => $courses->map(fn (Course $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'slug' => $c->slug,
                'status' => $c->marketplace_status,
                'price_cents' => $currencies->convert($c->price_cents, $c->currency, $currency),
                'learners' => $c->accesses_count,
                'revenue_cents' => (int) $items->where('course_id', $c->id)->sum('amount_cents'),
            ])->values(),
            'recent' => $items->take(10)->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'course' => $item->title,
                'price_cents' => $item->amount_cents,
                'paid_at' => $item->paid_at,
            ])->values(),
        ]);
    }
}
