<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Coupon;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * A workspace's discount codes for its online courses.
 */
class CouponController extends TenantController
{
    public function index(): JsonResponse
    {
        Gate::authorize('courses.manage');

        return response()->json(Coupon::with('course:id,title')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('courses.manage');
        $data = $request->validate([
            'code' => ['required', 'string', 'min:3', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/'],
            'percent_off' => ['required', 'integer', 'between:1,100'],
            'course_id' => ['nullable', 'uuid', Rule::exists('courses', 'id')->where('tenant_id', $this->tenant()->id)],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);
        $data['code'] = strtoupper($data['code']);
        validator($data, ['code' => [Rule::unique('coupons', 'code')]], ['code.unique' => __('That code is already taken. Try another one.')])->validate();

        return response()->json(Coupon::create($data)->load('course:id,title'), 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        Gate::authorize('courses.manage');
        $coupon->update($request->validate(['is_active' => ['required', 'boolean']]));

        return response()->json($coupon->load('course:id,title'));
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        Gate::authorize('courses.manage');
        $coupon->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Learners: what a code takes off the courses in their cart (before ordering).
     */
    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
            'course_ids' => ['required', 'array', 'max:20'],
            'course_ids.*' => ['uuid'],
        ]);
        $courses = Course::withoutGlobalScopes()->whereIn('id', $data['course_ids'])->get();

        return response()->json(Arr::except(static::resolve($data['code'], $courses->all()), 'coupon'));
    }

    /**
     * The coupon for a code and the discounted price of each course it covers.
     * Throws a validation error the cart can show when the code can't be used.
     *
     * @param  list<Course>  $courses
     * @return array{coupon: Coupon, code: string, percent_off: int, prices: array<string, int>}
     */
    public static function resolve(string $code, array $courses): array
    {
        $coupon = Coupon::findByCode($code);
        if (! $coupon || ! $coupon->isRedeemable()) {
            throw ValidationException::withMessages(['coupon' => __('This code is not valid or has expired.')]);
        }

        $prices = [];
        foreach ($courses as $course) {
            if ($coupon->appliesTo($course) && $course->price_cents > 0) {
                $prices[$course->id] = $coupon->apply($course->price_cents);
            }
        }
        if (! $prices) {
            throw ValidationException::withMessages(['coupon' => __('This code doesn’t apply to the courses in your cart.')]);
        }

        return ['coupon' => $coupon, 'code' => $coupon->code, 'percent_off' => $coupon->percent_off, 'prices' => $prices];
    }
}
