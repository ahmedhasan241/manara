<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Services\Commission;
use App\Services\Currencies;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Platform staff view of the course marketplace: sales, courses and moderation.
 */
class MarketplaceAdminController extends Controller
{
    public function __construct(private Marketplace $marketplace) {}

    public function index(Currencies $currencies, Commission $commission): JsonResponse
    {
        $paid = Order::where('status', 'paid');

        // Sales come in many currencies; totals are in the base currency, and Manara's
        // share uses the commission each sale was ordered with.
        $base = $currencies->base();
        $gross = 0;
        $platform = 0;
        foreach ((clone $paid)->with('items:id,order_id,price_cents,commission_percent')->get(['id', 'currency']) as $order) {
            foreach ($order->items as $item) {
                $amount = $currencies->convert($item->price_cents, $order->currency, $base);
                $gross += $amount;
                $platform += (int) round($amount * ($item->commission_percent ?? $commission->default()) / 100);
            }
        }

        $courses = $this->marketplace->courses()->where('is_public', true)->orderByDesc('accesses_count')->limit(50)->get();

        return response()->json([
            'currency' => $base,
            'gross_cents' => $gross,
            // The average share kept across all sales (rates differ by package and country).
            'platform_fee_percent' => $gross > 0 ? (int) round($platform / $gross * 100) : $commission->default(),
            'platform_revenue_cents' => $platform,
            'orders' => (clone $paid)->count(),
            'learners' => CourseAccess::distinct('user_id')->count('user_id'),
            'published' => Course::withoutGlobalScopes()->whereNull('deleted_at')->onMarketplace()->count(),
            'courses' => $courses->map(fn (Course $c) => [...$this->marketplace->card($c), 'status' => $c->marketplace_status])->values(),
            'recent_orders' => Order::with(['user:id,name,email', 'items:id,order_id,title,price_cents'])->latest()->limit(15)->get(),
        ]);
    }

    /**
     * Pause a course (e.g. after a complaint) or put it back.
     */
    public function update(Request $request, string $course): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->findOrFail($course);
        $data = $request->validate(['status' => ['required', Rule::in(['published', 'suspended'])]]);

        $course->update(['marketplace_status' => $data['status']]);

        return response()->json(['id' => $course->id, 'status' => $course->marketplace_status]);
    }
}
