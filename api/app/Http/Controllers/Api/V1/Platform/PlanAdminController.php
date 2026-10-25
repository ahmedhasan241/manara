<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlanAdminController extends Controller
{
    /**
     * @return Collection<int, Plan>
     */
    public function index(): Collection
    {
        return Plan::withCount(['subscriptions' => fn ($q) => $q->whereIn('status', ['active', 'trialing'])])->orderBy('sort_order')->get();
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Plan::create($this->validated($request)), 201);
    }

    public function update(Request $request, Plan $plan): Plan
    {
        $plan->update($this->validated($request, $plan));

        return $plan;
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
        ]);
    }
}
