<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseAccess;
use App\Models\Order;
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

    public function index(): JsonResponse
    {
        $paid = Order::where('status', 'paid');
        $gross = (int) (clone $paid)->sum('total_cents');
        $fee = config('services.payments.platform_fee_percent');

        $courses = $this->marketplace->courses()->where('is_public', true)->orderByDesc('accesses_count')->limit(50)->get();

        return response()->json([
            'gross_cents' => $gross,
            'platform_fee_percent' => $fee,
            'platform_revenue_cents' => (int) round($gross * $fee / 100),
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
