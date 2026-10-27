<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlanAdminController extends Controller
{
    /**
     * @return Collection<int, Plan>
     */
    public function index(): Collection
    {
        return Plan::with('prices')->withCount(['subscriptions' => fn ($q) => $q->whereIn('status', ['active', 'trialing'])])->orderBy('sort_order')->get();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $plan = DB::transaction(function () use ($data) {
            $plan = Plan::create(Arr::except($data, 'prices'));
            $this->syncPrices($plan, $data);

            return $plan;
        });

        return response()->json($plan->load('prices'), 201);
    }

    public function update(Request $request, Plan $plan): Plan
    {
        $data = $this->validated($request, $plan);
        DB::transaction(function () use ($plan, $data): void {
            $plan->update(Arr::except($data, 'prices'));
            $this->syncPrices($plan, $data);
        });

        return $plan->load('prices');
    }

    /**
     * Replaces the plan's country prices when the request includes them.
     *
     * @param  array<string, mixed>  $data
     */
    private function syncPrices(Plan $plan, array $data): void
    {
        if (! array_key_exists('prices', $data)) {
            return;
        }

        $prices = collect($data['prices'] ?? [])->keyBy(fn (array $price) => strtoupper($price['country']));
        $plan->prices()->whereNotIn('country', $prices->keys())->delete();
        foreach ($prices as $country => $price) {
            $plan->prices()->updateOrCreate(['country' => $country], [...$price, 'country' => $country, 'currency' => strtoupper($price['currency'])]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Plan $plan = null): array
    {
        $required = $plan ? 'sometimes' : 'required';

        return $request->validate([
            'code' => [$required, 'alpha_dash', 'max:40', Rule::unique('plans')->ignore($plan)],
            'name' => [$required, 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_monthly_cents' => [$required, 'integer', 'min:0'],
            'price_yearly_cents' => ['sometimes', 'integer', 'min:0'],
            'extra_student_cents' => ['sometimes', 'integer', 'min:0'],
            'extra_staff_cents' => ['sometimes', 'integer', 'min:0'],
            'video_addon_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'max_staff' => ['nullable', 'integer', 'min:1'],
            'storage_gb' => ['sometimes', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
            'translations' => ['nullable', 'array:ar,fr,es,pt,zh'],
            'translations.*' => ['array:name,description,features'],
            'translations.*.name' => ['nullable', 'string', 'max:80'],
            'translations.*.description' => ['nullable', 'string', 'max:1000'],
            'translations.*.features' => ['nullable', 'array'],
            'translations.*.features.*' => ['string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            // Prices per country; countries left out fall back to the default price above.
            'prices' => ['sometimes', 'nullable', 'array', 'max:250'],
            'prices.*.country' => ['required', 'string', 'size:2', 'distinct:ignore_case'],
            'prices.*.currency' => ['required', 'string', 'size:3'],
            'prices.*.price_monthly_cents' => ['required', 'integer', 'min:0'],
            'prices.*.price_yearly_cents' => ['required', 'integer', 'min:0'],
            'prices.*.extra_student_cents' => ['sometimes', 'integer', 'min:0'],
            'prices.*.extra_staff_cents' => ['sometimes', 'integer', 'min:0'],
            'prices.*.video_addon_cents' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
