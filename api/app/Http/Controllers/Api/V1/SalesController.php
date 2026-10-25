<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * A workspace's course sales: revenue, earnings after the platform fee,
 * learners per course and recent purchases.
 */
class SalesController extends TenantController
{
    public function __invoke(): JsonResponse
    {
        Gate::authorize('courses.manage');
        $tenantId = $this->tenant()->id;
        $fee = config('services.payments.platform_fee_percent');

        $items = OrderItem::where('order_items.tenant_id', $tenantId)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'paid')
            ->select('order_items.*', 'orders.paid_at', 'orders.user_id', 'orders.currency')
            ->orderByDesc('orders.paid_at')
            ->get();
        $revenue = (int) $items->sum('price_cents');

        $courses = Course::where('is_public', true)->withCount('accesses')->orderBy('title')->get();

        return response()->json([
            'currency' => $items->first()->currency ?? 'USD',
            'revenue_cents' => $revenue,
            'platform_fee_percent' => $fee,
            'earnings_cents' => (int) round($revenue * (100 - $fee) / 100),
            'sales' => $items->count(),
            'learners' => CourseAccess::where('tenant_id', $tenantId)->distinct('user_id')->count('user_id'),
            'courses' => $courses->map(fn (Course $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'slug' => $c->slug,
                'status' => $c->marketplace_status,
                'price_cents' => $c->price_cents,
                'learners' => $c->accesses_count,
                'revenue_cents' => (int) $items->where('course_id', $c->id)->sum('price_cents'),
            ])->values(),
            'recent' => $items->take(10)->map(fn ($item) => [
                'id' => $item->id,
                'course' => $item->title,
                'price_cents' => $item->price_cents,
                'paid_at' => $item->paid_at,
            ])->values(),
        ]);
    }
}
