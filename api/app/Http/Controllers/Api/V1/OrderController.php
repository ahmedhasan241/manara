<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Coupon;
use App\Models\Course;
use App\Models\Order;
use App\Services\Currencies;
use App\Services\Marketplace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Buying marketplace courses: create an order from the cart, pay it, and get
 * access. Free courses skip the order.
 */
class OrderController extends Controller
{
    public function __construct(private Marketplace $marketplace, private Currencies $currencies) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(Order::where('user_id', $request->user()->id)->with('items:id,order_id,course_id,title,price_cents')->latest()->get());
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        return response()->json($order->load('items:id,order_id,course_id,title,price_cents'));
    }

    /**
     * A pending order for the courses in the cart. Courses the buyer already
     * has are left out; free ones are granted right away.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_ids' => ['required', 'array', 'min:1', 'max:20'],
            'course_ids.*' => ['uuid'],
            'coupon' => ['nullable', 'string', 'max:32'],
        ]);
        $user = $request->user();

        $courses = Course::withoutGlobalScopes()->whereNull('deleted_at')->onMarketplace()->whereIn('id', $data['course_ids'])->get()
            ->reject(fn (Course $c) => $this->marketplace->owns($user, $c));

        foreach ($courses->filter->isFree() as $course) {
            $this->marketplace->grant($user, $course, 'free');
        }
        $paid = $courses->reject->isFree();

        if ($paid->isEmpty()) {
            return response()->json(['order' => null, 'granted' => $courses->pluck('id')->values()], 201);
        }
        if ($paid->pluck('currency')->unique()->count() > 1) {
            throw ValidationException::withMessages(['course_ids' => __('Courses in different currencies must be bought separately.')]);
        }

        $currency = $paid->first()->currency;
        $display = $request->attributes->get('currency', $currency);
        $discount = ! empty($data['coupon']) ? CouponController::resolve($data['coupon'], $paid->values()->all()) : null;
        $priceOf = fn (Course $course): int => $discount['prices'][$course->id] ?? $course->price_cents;

        $order = DB::transaction(function () use ($user, $paid, $currency, $display, $discount, $priceOf): Order {
            $subtotal = $paid->sum('price_cents');
            $total = $paid->sum($priceOf);
            $order = Order::create([
                'user_id' => $user->id,
                'status' => 'pending',
                'subtotal_cents' => $subtotal,
                'discount_cents' => $subtotal - $total,
                'total_cents' => $total,
                'coupon_code' => $discount['code'] ?? null,
                'currency' => $currency,
                'display_currency' => $display,
                'exchange_rate' => $this->currencies->rate($display) / $this->currencies->rate($currency),
            ]);
            foreach ($paid as $course) {
                $order->items()->create(['course_id' => $course->id, 'tenant_id' => $course->tenant_id, 'title' => $course->title, 'price_cents' => $priceOf($course), 'list_price_cents' => $course->price_cents]);
            }

            return $order;
        });

        return response()->json(['order' => $order->load('items'), 'granted' => $courses->filter->isFree()->pluck('id')->values()], 201);
    }

    /**
     * Pays an order. Only the "test" driver exists today: it marks the order paid
     * without charging anyone, and is refused in production.
     */
    public function pay(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        abort_unless($order->user_id === $user->id, 404);
        abort_if($order->status === 'paid', 409, __('This order is already paid.'));
        abort_if($order->status !== 'pending', 422, __('This order can no longer be paid.'));

        $driver = config('services.payments.driver');
        if ($driver !== 'test' || app()->environment('production')) {
            abort(503, __('Online payments are not available yet.'));
        }

        DB::transaction(function () use ($order, $user): void {
            $order->update(['status' => 'paid', 'paid_at' => now(), 'provider' => 'test', 'provider_reference' => 'test_'.Str::lower(Str::random(14))]);
            if ($order->coupon_code) {
                Coupon::findByCode($order->coupon_code)?->increment('uses_count');
            }
            foreach ($order->items as $item) {
                $course = Course::withoutGlobalScopes()->find($item->course_id);
                if ($course) {
                    $this->marketplace->grant($user, $course, 'purchase', $order);
                }
            }
        });
        ActivityLog::record('order.paid', $order, ['total_cents' => $order->total_cents], $user);

        return response()->json($order->fresh('items'));
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);
        abort_unless($order->status === 'pending', 422, __('Only unpaid orders can be canceled.'));
        $order->update(['status' => 'canceled']);

        return response()->json($order);
    }

    /**
     * "Enroll for free" on a free course.
     */
    public function enrollFree(Request $request, string $slug): JsonResponse
    {
        $course = Course::withoutGlobalScopes()->whereNull('deleted_at')->onMarketplace()->where('slug', $slug)->firstOrFail();
        abort_unless($course->isFree(), 422, __('This course is not free.'));

        $this->marketplace->grant($request->user(), $course, 'free');

        return response()->json(['owned' => true], 201);
    }
}
